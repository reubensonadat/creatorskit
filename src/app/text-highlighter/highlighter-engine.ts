// Text Highlighter Engine — Cinematic Journal Sweep Renderer
//
// WHAT MAKES THIS ENGINE A HIGHLIGHTER (and not a match cut):
// A human hand slowly drags a marker across a full journal paragraph — the
// anchor phrase may wrap across MULTIPLE lines and the sweep flows line to
// line with eased, hand-drawn motion. The camera may sit on the masthead,
// the headline, or a body paragraph (highlightSector). Nothing is locked to
// a fixed slot; the drama is the stroke itself, not optical stability.
//
// The rapid whip-cut montage with an anchor locked to one fixed line lives
// in src/app/match-cut/match-cut-engine.ts. Shared paper graphics, themes
// and sounds live in src/lib/paper-graphics.ts and src/lib/studio-sounds.ts.

import {
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

    // Anchor center in document space (multi-line sweep — may legitimately
    // occupy several lines; that is correct for a highlighter).
    const docHeadlineY = 500;
    let anchorMinX = Infinity;
    let anchorMaxX = -Infinity;
    let anchorMinY = Infinity;
    let anchorMaxY = -Infinity;

    headlineLines.forEach((line, lineIdx) => {
        const lineY = docHeadlineY + lineIdx * headlineLineHeight;
        const lineStartX = pageLeftX + (pageWidth - line.w) / 2; // Center-aligned line
        line.words.forEach((w) => {
            const wx = lineStartX + w.x;
            if (w.isAnchor) {
                anchorMinX = Math.min(anchorMinX, wx);
                anchorMaxX = Math.max(anchorMaxX, wx + w.w);
                anchorMinY = Math.min(anchorMinY, lineY);
                anchorMaxY = Math.max(anchorMaxY, lineY + headlineLineHeight);
            }
        });
    });

    let docAnchorCenterX = anchorMinX !== Infinity ? (anchorMinX + anchorMaxX) / 2 : pageLeftX + pageWidth / 2;
    let docAnchorCenterY = anchorMinY !== Infinity ? (anchorMinY + anchorMaxY) / 2 : docHeadlineY + (headlineLines.length * headlineLineHeight) / 2;

    // The journal sweep may focus a specific document sector.
    const sector = options.highlightSector || 'center-headline';
    if (sector === 'top-masthead') {
        docAnchorCenterX = pageLeftX + pageWidth / 2;
        docAnchorCenterY = docHeadlineY - 90;
    } else if (sector === 'body-paragraph') {
        docAnchorCenterX = pageLeftX + pageWidth * 0.28;
        docAnchorCenterY = docHeadlineY + 160;
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
        const progress = options.highlightProgress ?? 1;
        const dir = options.zoomDirection === 'out' ? -1 : 1;
        const zoomScale = 1 + dir * (options.zoomIntensity ?? 0.1) * progress;
        ctx.translate(docAnchorCenterX, docAnchorCenterY);
        ctx.scale(zoomScale, zoomScale);
        ctx.translate(-docAnchorCenterX, -docAnchorCenterY);
    }

    const bodyParas = (cut.bodyParagraphs && cut.bodyParagraphs.length > 0)
        ? cut.bodyParagraphs
        : BACKGROUND_BODY_PARAGRAPHS;

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
    // SECTION B: Masthead & Dateline
    // ------------------------------------------------------------
    if (options.showMasthead !== false) {
        const mastheadText = (cut.masthead || 'JOURNAL OF CREATIVE RESEARCH').toUpperCase();
        const mastheadY = docHeadlineY - 95;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = theme.ink;
        ctx.font = `900 ${Math.max(16, Math.round(width * 0.024))}px "Playfair Display", Georgia, serif`;
        ctx.fillText(mastheadText, pageLeftX + pageWidth / 2, mastheadY);

        if (cut.dateString) {
            ctx.font = `bold ${Math.max(10, Math.round(width * 0.012))}px "Courier New", monospace`;
            ctx.fillStyle = theme.inkMuted;
            ctx.fillText(cut.dateString.toUpperCase(), pageLeftX + pageWidth / 2, mastheadY + 28);
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

    // 1. Gather all anchor chunks across lines and phrases
    const hlChunks: { phraseIndex: number; lineIdx: number; x: number; y: number; w: number }[] = [];
    headlineLines.forEach((line, lineIdx) => {
        const lineY = docHeadlineY + lineIdx * headlineLineHeight;
        const lineStartX = pageLeftX + (pageWidth - line.w) / 2;
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
                    hlChunks.push({ phraseIndex: curPhraseIdx, lineIdx, x: groupStartX, y: lineY, w: groupEndX - groupStartX });
                    groupStartX = wx;
                    curPhraseIdx = w.phraseIndex;
                }
                groupEndX = wx + w.w;
            } else {
                if (groupStartX !== -1) {
                    hlChunks.push({ phraseIndex: curPhraseIdx, lineIdx, x: groupStartX, y: lineY, w: groupEndX - groupStartX });
                    groupStartX = -1;
                    groupEndX = -1;
                }
            }
        }
        if (groupStartX !== -1) {
            hlChunks.push({ phraseIndex: curPhraseIdx, lineIdx, x: groupStartX, y: lineY, w: groupEndX - groupStartX });
        }
    });

    const numPhrases = hlChunks.length > 0 ? Math.max(...hlChunks.map((c) => c.phraseIndex)) + 1 : 1;
    const isAnimated = options.animationMode === 'animated-highlight';
    const progress = isAnimated ? Math.min(1, Math.max(0, options.highlightProgress ?? 1)) : 1;

    // Draw highlights sequentially with a pause between distinct phrases
    hlChunks.forEach((chunk) => {
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
        const phraseChunks = hlChunks.filter((c) => c.phraseIndex === pIdx);
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
            chunk.y + headlineFontSize * 0.5,
            chunk.w,
            headlineFontSize,
            { ...options, highlightProgress: chunkProg }
        );
    });

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

    const headlineH = headlineLines.length * headlineLineHeight;
    let afterHeadlineY = docHeadlineY + headlineH + 16;

    // Thin rule below the sentence
    if (options.showDividerRules !== false) {
        ctx.save();
        ctx.strokeStyle = theme.ruleColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pageLeftX, afterHeadlineY);
        ctx.lineTo(pageLeftX + pageWidth, afterHeadlineY);
        ctx.stroke();
        afterHeadlineY += 16;
        ctx.restore();
    }

    // ------------------------------------------------------------
    // SECTION D: Subhead & Byline
    // ------------------------------------------------------------
    if (options.showSubhead !== false && cut.subhead) {
        ctx.save();
        const subheadFont = `italic ${Math.max(14, Math.round(width * 0.0175))}px Georgia, "Times New Roman", serif`;
        const subheadLines = wrapSimpleText(ctx, cut.subhead, subheadFont, pageWidth);
        const subheadLineH = Math.max(20, Math.round(width * 0.024));

        ctx.font = subheadFont;
        ctx.fillStyle = theme.inkMuted;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        subheadLines.forEach((sLine, idx) => {
            ctx.fillText(sLine, pageLeftX, afterHeadlineY + idx * subheadLineH);
        });

        afterHeadlineY += subheadLines.length * subheadLineH + 12;
        ctx.restore();
    }

    if (options.showByline !== false && (cut.byline || cut.location)) {
        ctx.save();
        ctx.font = `bold italic ${Math.max(12, Math.round(width * 0.0155))}px Georgia, serif`;
        ctx.fillStyle = theme.inkMuted;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const bylineStr = [cut.location, cut.byline].filter(Boolean).join(' — ') || 'From Our Special Correspondent';
        ctx.fillText(bylineStr, pageLeftX, afterHeadlineY);
        afterHeadlineY += 26;
        ctx.restore();
    }

    // Thin rule below byline
    if (options.showDividerRules !== false) {
        ctx.save();
        ctx.strokeStyle = theme.ruleColor;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(pageLeftX, afterHeadlineY);
        ctx.lineTo(pageLeftX + pageWidth, afterHeadlineY);
        ctx.stroke();
        afterHeadlineY += 14;
        ctx.restore();
    }

    // ------------------------------------------------------------
    // SECTION E: Dense Bottom Columns
    // ------------------------------------------------------------
    if (options.showBottomColumns !== false) {
        const bottomColumnsH = 1600;
        drawDenseColumns(
            ctx,
            pageLeftX,
            afterHeadlineY,
            pageWidth,
            bottomColumnsH,
            bodyParas,
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
