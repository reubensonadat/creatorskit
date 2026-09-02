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

    // Body Copy Typography (for background columns)
    const bodyFontSize = Math.max(12, Math.round(width * 0.0165));
    const bodyLineHeight = bodyFontSize * 1.52;
    const bodyFont = `${bodyFontSize}px Georgia, "Times New Roman", serif`;

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

    const docHeadlineY = 500;

    const sector = options.highlightSector || 'center-headline';
    const isAnimated = options.animationMode === 'animated-highlight';
    const progress = isAnimated ? Math.min(1, Math.max(0, options.highlightProgress ?? 1)) : 1;

    // Masthead geometry (Section B mirrors these exact values when drawing)
    const mastheadText = (cut.masthead || 'JOURNAL OF CREATIVE RESEARCH').toUpperCase();
    const mastheadFontPx = Math.max(16, Math.round(width * 0.024));
    const mastheadFont = `900 ${mastheadFontPx}px "Playfair Display", Georgia, serif`;
    const mastheadY = docHeadlineY - 95; // alphabetic baseline of the masthead name
    const mastheadLineH = Math.round(mastheadFontPx * 1.25);

    // ------------------------------------------------------------
    // FLOWING DOCUMENT LAYOUT (document space, measured BEFORE the
    // camera so the sweep target position is known when focusing)
    // ------------------------------------------------------------
    const headlineH = headlineLines.length * headlineLineHeight;
    const headlineRuleY = docHeadlineY + headlineH + 16;
    let flowY = headlineRuleY;
    if (options.showDividerRules !== false) flowY += 16;

    const subheadFont = `italic ${Math.max(14, Math.round(width * 0.0175))}px Georgia, "Times New Roman", serif`;
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
    let mastheadSweepLines: HeadlineLine[] = [];
    if (sector === 'top-masthead') {
        ctx.font = mastheadFont;
        mastheadSweepLines = wrapHeadlineWithAnchor(ctx, mastheadText, anchor, pageWidth);
        // If the anchor phrase is not part of the masthead, sweep the whole
        // masthead name — circling the publication itself reads intentional.
        if (!mastheadSweepLines.some((l) => l.words.some((w) => w.isAnchor))) {
            mastheadSweepLines.forEach((l) => l.words.forEach((w) => {
                w.isAnchor = true;
                w.phraseIndex = 0;
            }));
        }
    }

    let bodySweepLines: HeadlineLine[] = [];
    if (sector === 'body-paragraph') {
        const bodySource = bodyParas[0] || '';
        if (bodySource) {
            ctx.font = bodyFont;
            const matched = matchAnchorWords(bodySource, parseAnchorPhrases(anchor, 512)).some((w) => w.isAnchor);
            const firstSentence = bodySource.match(/^[^.!?]*[.!?]/);
            // If the anchor phrase does not appear in the body text, sweep the
            // first sentence — a full-paragraph smear would be unreadable.
            const sweepText = matched || !firstSentence ? bodySource : firstSentence[0];
            bodySweepLines = wrapHeadlineWithAnchor(ctx, sweepText, anchor, pageWidth * 0.94);
            if (!matched) {
                bodySweepLines.forEach((l) => l.words.forEach((w) => {
                    w.isAnchor = true;
                    w.phraseIndex = 0;
                }));
            }
        }
    }
    const bodySweepH = bodySweepLines.length * bodyLineHeight;

    // Sweep chunks per sector (empty for non-active sectors → no stroke there)
    const headlineChunks = sector === 'center-headline'
        ? collectSweepChunks(headlineLines, docHeadlineY, headlineLineHeight, (l) => pageLeftX + (pageWidth - l.w) / 2)
        : [];
    const mastheadChunks = mastheadSweepLines.length > 0
        ? collectSweepChunks(mastheadSweepLines, mastheadY - mastheadFontPx * 0.9, mastheadLineH, (l) => pageLeftX + (pageWidth - l.w) / 2)
        : [];
    const bodyChunks = bodySweepLines.length > 0
        ? collectSweepChunks(bodySweepLines, bodySweepStartY, bodyLineHeight, () => bodySweepX)
        : [];

    const activeChunks = sector === 'top-masthead'
        ? mastheadChunks
        : sector === 'body-paragraph'
            ? bodyChunks
            : headlineChunks;
    const activeLineH = sector === 'top-masthead'
        ? mastheadLineH
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
        const topColumnsBottomY = docHeadlineY - 145;
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

        if (mastheadChunks.length > 0) {
            drawSweepChunks(ctx, mastheadChunks, mastheadFontPx, progress, options);
        }

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
        ctx.font = `bold italic ${Math.max(12, Math.round(width * 0.0155))}px Georgia, serif`;
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
        const remainingParas = bodySweepLines.length > 0 && bodyParas.length > 1
            ? bodyParas.slice(1)
            : bodyParas;
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
