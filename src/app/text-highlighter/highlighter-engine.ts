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
    parseAnchorPhrases,
    wrapSimpleText,
    type AnchorWord,
    type NewspaperCut,
    type PaperTheme,
    type PaperThemeKey,
} from '@/lib/paper-graphics';
import { buildPhraseBodySentence } from './highlighter-presets';
import { clamp01 } from '@/lib/motion/easing';

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
}

interface HeadlineLine {
    text: string;
    words: { word: string; isAnchor: boolean; phraseIndex: number; x: number; w: number }[];
    w: number;
}

/**
 * Wraps the journal headline naturally and computes exact anchor word
 * positions across multiple lines & phrases — the sweep then flows through
 * these chunks line by line.
 */
function wrapHeadlineWithAnchor(
    ctx: CanvasRenderingContext2D,
    text: string,
    anchorInput: string,
    maxWidth: number
): HeadlineLine[] {
    const cleanText = text.trim();
    if (!cleanText) return [];

    const phrases = parseAnchorPhrases(anchorInput, 512); // highlighter anchors may be long
    const wordObjects: AnchorWord[] = matchAnchorWords(cleanText, phrases);

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
 */
function drawSweepChunks(
    ctx: CanvasRenderingContext2D,
    chunks: SweepChunk[],
    fontSize: number,
    progress: number,
    options: HighlighterRenderOptions
) {
    if (chunks.length === 0) return;
    const numPhrases = Math.max(...chunks.map((c) => c.phraseIndex)) + 1;

    chunks.forEach((chunk) => {
        const pIdx = chunk.phraseIndex;
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
    const headlineLines = wrapHeadlineWithAnchor(ctx, headlineRaw, anchor, maxHeadlineW);

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
        const anchorPhrases = parseAnchorPhrases(anchor || headlineRaw, 512);
        const strapText = (anchorPhrases.length > 0 ? anchorPhrases : [headlineRaw])
            .map((p) => p.toUpperCase())
            .join('  ·  ');
        ctx.font = `900 ${strapFontPx}px ${chosenFont}`;
        strapLines = wrapHeadlineWithAnchor(ctx, strapText, strapText, pageWidth * 0.9);
        // The strapline IS the phrase — every word is sweepable.
        strapLines.forEach((l) => l.words.forEach((w) => {
            w.isAnchor = true;
            w.phraseIndex = 0;
        }));
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
        const phrases = parseAnchorPhrases(anchor, 512);
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
                sweepText = buildPhraseBodySentence(anchor, variantSeed);
                sweepBodyParas = [sweepText, ...bodyParas];
            }

            ctx.font = bodyFont;
            bodySweepLines = wrapHeadlineWithAnchor(ctx, sweepText, anchor, pageWidth * 0.94);

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
            bodySweepLines = wrapHeadlineWithAnchor(ctx, bodyParas[0], '', pageWidth * 0.94);
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

    // Anchor center in document space — bbox of the ACTIVE sector's stroke.
    let docAnchorCenterX: number;
    let docAnchorCenterY: number;
    if (activeChunks.length > 0) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        activeChunks.forEach((c) => {
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

        drawSweepChunks(ctx, strapChunks, strapFontPx, progress, options);
        ctx.restore();
    }

    // ------------------------------------------------------------
    // SECTION C: The Journal Sentence & Sweep Highlight
    // ------------------------------------------------------------
    ctx.save();
    ctx.font = headlineFont;
    ctx.textBaseline = 'top';

    // 1. Sweep highlight — only the center (headline) sector strokes here
    drawSweepChunks(ctx, headlineChunks, headlineFontSize, progress, options);

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

        drawSweepChunks(ctx, bodyChunks, bodyFontSize, progress, options);

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
// PAPER ENTRANCE — the pre-sweep slam.
//
// The viral pattern: before any highlighting starts, the whole news article
// flies into view (top→bottom, bottom→top, left→right, right→left) with
// directional motion blur and a settle tilt, lands dead center, holds for a
// configurable beat (0–4s), and only then does the marker sweep begin.
// Deterministic Motion-as-Code: the caller drives `entranceProgress` (0..1
// across the flight+hold window) exactly like `highlightProgress`, so the
// live preview and the frame-stepped exporter produce identical pixels.
// ─────────────────────────────────────────────────────────────────────────────

let entranceBuffer: HTMLCanvasElement | null = null;
function getEntranceBuffer(width: number, height: number): HTMLCanvasElement {
    if (!entranceBuffer) entranceBuffer = document.createElement('canvas');
    if (entranceBuffer.width !== width || entranceBuffer.height !== height) {
        entranceBuffer.width = width;
        entranceBuffer.height = height;
    }
    return entranceBuffer;
}

export function renderHighlighterStoryWithEntrance(
    targetCanvasCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cut: NewspaperCut,
    options: HighlighterRenderOptions,
    frameIndex = 0
) {
    const dir = options.entranceDirection ?? 'none';
    const progress = clamp01(options.entranceProgress ?? 1);

    // Entrance finished (or disabled, or SSR) → straight to the classic render.
    if (dir === 'none' || typeof document === 'undefined' || progress >= 1) {
        renderHighlighterStory(targetCanvasCtx, width, height, cut, options, frameIndex);
        return;
    }

    const tctx = targetCanvasCtx;
    const theme: PaperTheme = PAPER_THEMES[options.paperTheme] || PAPER_THEMES.academic;

    // 1. Backdrop: the EXACT paper color — the article slides in over more
    //    of itself, so the flight reads as one continuous sheet settling on
    //    the stack, never a dark pit behind a floating rectangle.
    tctx.save();
    tctx.fillStyle = theme.bg;
    tctx.fillRect(0, 0, width, height);
    tctx.restore();

    // 2. Render the untouched document (no sweep strokes yet) offscreen.
    const buf = getEntranceBuffer(width, height);
    const bctx = buf.getContext('2d')!;
    renderHighlighterStory(bctx, width, height, cut, { ...options, highlightProgress: 0 }, frameIndex);

    // 3. ONE damped spring drives every channel — position, rotation, scale,
    //    blur and shadow — like a single After Effects expression: explosive
    //    launch, travel, a small overshoot past center, then a tiny damped
    //    settle. Shared-curve motion is what separates pro animation from
    //    "sloppy": no channel floats on its own timeline.
    const FLIGHT_SHARE = 0.8; // flight occupies 80% of the window; rest is the settle hold
    const t2 = Math.min(1, progress / FLIGHT_SHARE);
    const springDisp = (x: number) => Math.exp(-4.2 * x) * Math.cos(8.5 * x); // remaining-displacement spring
    const d = Math.max(-0.2, Math.min(1, springDisp(t2))); // dips ≤ −0.2 → overshoot past center

    // Instantaneous velocity (finite difference) — drives the smear so blur
    // is strongest at launch and dies the INSTANT the paper touches down.
    const dt = 0.016;
    const dNext = Math.max(-0.2, Math.min(1, springDisp(t2 + dt)));
    const vel = Math.abs(d - dNext) / dt;
    const speed = Math.min(1, vel / 5); // normalized 0..1

    const axisLen = dir === 'top' || dir === 'bottom' ? height : width;
    const travel = axisLen * 1.3;
    let dx = 0;
    let dy = 0;
    if (dir === 'top') dy = -travel * d;
    else if (dir === 'bottom') dy = travel * d;
    else if (dir === 'left') dx = -travel * d;
    else if (dir === 'right') dx = travel * d;
    const tiltSign = dir === 'left' || dir === 'top' ? -1 : 1;
    const tilt = ((options.entranceTilt ?? 4) * Math.PI / 180) * d * tiltSign;
    const scale = 1 + ((options.entranceScaleFrom ?? 1.07) - 1) * Math.max(0, d);
    const blur = clamp01(options.entranceBlur ?? 0.8);

    // 4. Landing shadow — deepens as the paper approaches the stack.
    const approach = 1 - Math.min(1, Math.abs(d));
    const shadow = tctx.createRadialGradient(
        width / 2, height / 2 + height * 0.015, Math.min(width, height) * 0.08,
        width / 2, height / 2 + height * 0.015, Math.max(width, height) * 0.5
    );
    shadow.addColorStop(0, `rgba(0,0,0,${(0.05 + 0.14 * approach).toFixed(3)})`);
    shadow.addColorStop(1, 'rgba(0,0,0,0)');
    tctx.save();
    tctx.fillStyle = shadow;
    tctx.fillRect(0, 0, width, height);
    tctx.restore();

    // 5. TRUE directional motion blur — a continuous streak, not discrete
    //    ghosts: 16 samples laid along the motion path BEHIND the paper,
    //    Gaussian-weighted (solid leading edge, smearing tail), spacing ∝
    //    velocity², and each trail copy softened with a small canvas blur so
    //    ghost boundaries dissolve into one smear — the After Effects
    //    "directional blur" look. The streak is huge at launch and collapses
    //    to exactly zero on touchdown, so the paper snaps crisp.
    const ux = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const uy = dir === 'top' ? -1 : dir === 'bottom' ? 1 : 0;
    const smear = axisLen * 0.35 * blur * speed * speed;
    const samples = blur > 0.02 ? 16 : 1;
    const weights: number[] = [];
    let wSum = 0;
    for (let k = 0; k < samples; k++) {
        const f = samples > 1 ? k / (samples - 1) : 0;
        const w = Math.exp(-Math.pow(f / 0.3, 2)); // gaussian falloff along the trail
        weights.push(w);
        wSum += w;
    }
    for (let k = samples - 1; k >= 0; k--) {
        const f = samples > 1 ? k / (samples - 1) : 0;
        const off = smear * f;
        const alpha = Math.min(1, (weights[k] / wSum) * 2.1); // gain keeps the head solid
        tctx.save();
        tctx.globalAlpha = alpha;
        try {
            if (k > 0) tctx.filter = `blur(${(1 + f * 4).toFixed(1)}px)`; // dissolve ghost edges
        } catch { /* filters unsupported — crisp trail still works */ }
        tctx.translate(width / 2 + dx - ux * off, height / 2 + dy - uy * off);
        tctx.rotate(tilt);
        tctx.scale(scale, scale);
        tctx.translate(-width / 2, -height / 2);
        tctx.drawImage(buf, 0, 0);
        tctx.restore();
    }
    try { tctx.filter = 'none'; } catch { /* ignore */ }
}
