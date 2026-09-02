// Text Match Cut Engine — Anchor-Locked Optical Match-Cut Renderer
//
// WHAT MAKES THIS ENGINE A MATCH-CUT ENGINE (and not a highlighter):
//  1. The headline is ALWAYS one single line — it never wraps, never stacks.
//     The font uniformly shrinks until the whole sentence fits the page.
//  2. The camera locks onto the highlighted anchor phrase wherever it sits
//     inside that line (left, middle or right) — the anchor stays dead-center
//     on screen while mastheads, fonts and body copy whip past around it.
// That is the optical match-cut illusion, and this file exists ONLY to
// guarantee it.
//
// Shared paper graphics/themes/sounds live in src/lib/paper-graphics.ts and
// src/lib/studio-sounds.ts — the slow multi-line journal sweep lives in
// src/app/text-highlighter/highlighter-engine.ts.

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
  type NewspaperCut,
  type PaperTheme,
  type PaperThemeKey,
} from '@/lib/paper-graphics';

// Re-exported so existing page/preset imports keep working from this module.
export { PAPER_THEMES } from '@/lib/paper-graphics';
export type { NewspaperCut, PaperThemeKey } from '@/lib/paper-graphics';
export {
  easeHighlightSweep,
  playCutSound,
  synthesizeCutSound,
} from '@/lib/studio-sounds';

export interface RenderOptions {
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
  /** Accepted for API compatibility — the match-cut camera ALWAYS locks onto the anchor. */
  highlightSector?: 'top-masthead' | 'center-headline' | 'body-paragraph';
  fontFamily?: string;
  fontCycleList?: string[]; // 5 fonts for rapid match cuts

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
}

interface PositionedWord {
  word: string;
  isAnchor: boolean;
  phraseIndex: number;
  x: number;
  w: number;
}

interface SingleLineLayout {
  fontSize: number;
  lineHeight: number;
  words: PositionedWord[];
  lineWidth: number;
}

/**
 * THE match-cut guarantee, in one function:
 * The ENTIRE headline is laid out on ONE single line. The font uniformly
 * shrinks until the whole sentence fits the page width — it can never wrap
 * to a second line, in any cut, ever. Anchor words are tagged with their
 * exact x-offsets so the camera can lock onto the phrase wherever it sits
 * inside the line (left, middle or right).
 */
function layoutSingleLineHeadline(
  ctx: CanvasRenderingContext2D,
  headlineRaw: string,
  anchorInput: string,
  pageWidth: number,
  baseFontSize: number,
  chosenFont: string
): SingleLineLayout {
  const phrases = parseAnchorPhrases(anchorInput, 23);
  const tagged = matchAnchorWords(headlineRaw, phrases);

  // If nothing matched at all, highlight the whole line so the composition
  // still reads as a match cut.
  if (!tagged.some((w) => w.isAnchor)) {
    tagged.forEach((w) => { w.isAnchor = true; w.phraseIndex = 0; });
  }

  // Uniform shrink until the WHOLE sentence fits one line.
  let fontSize = baseFontSize;
  const maxLineW = pageWidth * 0.94;
  const sentence = tagged.map((w) => w.word).join(' ');
  for (let guard = 0; guard < 64; guard++) {
    ctx.font = `italic 600 ${Math.round(fontSize)}px ${chosenFont}`;
    if (ctx.measureText(sentence).width <= maxLineW || fontSize <= 12) break;
    fontSize *= 0.95;
  }

  ctx.font = `italic 600 ${Math.round(fontSize)}px ${chosenFont}`;
  const spaceW = ctx.measureText(' ').width;

  // Position every word on the single line, left to right.
  let curX = 0;
  const words: PositionedWord[] = tagged.map((w) => {
    const wW = ctx.measureText(w.word).width;
    const item: PositionedWord = { word: w.word, isAnchor: w.isAnchor, phraseIndex: w.phraseIndex, x: curX, w: wW };
    curX += wW + spaceW;
    return item;
  });

  return {
    fontSize: Math.round(fontSize),
    lineHeight: Math.round(fontSize) * 1.35,
    words,
    lineWidth: Math.max(0, curX - spaceW),
  };
}

/**
 * Main Anchor-Locked Match-Cut Renderer
 */
export function renderNewspaperMatchCut(
  targetCanvasCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cut: NewspaperCut,
  options: RenderOptions,
  frameIndex = 0
) {
  const theme: PaperTheme = PAPER_THEMES[options.paperTheme] || PAPER_THEMES.vintage;
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

  // Geometry
  const pageWidth = Math.min(width * 0.92, 1040);
  const pageLeftX = (width - pageWidth) / 2;

  // Resolve Font Family
  const DEFAULT_CYCLE = [
    '"Playfair Display", Georgia, serif',
    '"Courier New", Courier, monospace',
    '"Caveat", "Segoe Script", "Brush Script MT", cursive',
    '"Times New Roman", Times, serif',
    '"Helvetica Neue", Arial, sans-serif',
  ];

  let chosenFont = '"Playfair Display", Georgia, serif';
  if (options.fontCycleList && options.fontCycleList.length > 0) {
    chosenFont = options.fontCycleList[frameIndex % options.fontCycleList.length];
  } else if (options.fontFamily === 'cycle-dynamic') {
    chosenFont = DEFAULT_CYCLE[frameIndex % DEFAULT_CYCLE.length];
  } else if (options.fontFamily) {
    chosenFont = options.fontFamily;
  }

  // Body Copy Typography (for background columns)
  const bodyFontSize = Math.max(12, Math.round(width * 0.0165));
  const bodyLineHeight = bodyFontSize * 1.52;
  const bodyFont = `${bodyFontSize}px Georgia, "Times New Roman", serif`;

  // Headline Typography — ONE single line, never wrapped (see layoutSingleLineHeadline)
  const baseHeadlineSize = Math.max(24, Math.round(width * 0.038)) * (options.headlineScale ?? 1);
  const headlineRaw = (cut.headline || '').trim() || 'AI-generated code contains more bugs and errors than human output';
  const layout = layoutSingleLineHeadline(
    ctx,
    headlineRaw,
    options.anchorPhrase,
    pageWidth,
    baseHeadlineSize,
    chosenFont
  );

  const { fontSize: headlineFontSize, lineHeight: headlineLineHeight, words, lineWidth } = layout;
  // Cursive (italic) headline styling over heavy bold — the marked-up
  // hand-annotated look the match-cut montage is going for.
  const headlineFont = `italic 600 ${headlineFontSize}px ${chosenFont}`;
  ctx.font = headlineFont;

  // The single headline line sits at a FIXED document Y in every cut.
  const docHeadlineY = 500;
  // The single line is centered on the page; the camera locks onto the
  // anchor phrase itself, wherever it sits inside the sentence.
  const lineStartX = pageLeftX + (pageWidth - lineWidth) / 2;

  // Anchor bbox in document space: the anchor may sit anywhere inside the
  // line (left / middle / right) — the camera centers on IT, not the line.
  let anchorMinX = Infinity;
  let anchorMaxX = -Infinity;
  words.forEach((w) => {
    if (w.isAnchor) {
      anchorMinX = Math.min(anchorMinX, lineStartX + w.x);
      anchorMaxX = Math.max(anchorMaxX, lineStartX + w.x + w.w);
    }
  });

  const docAnchorCenterX = anchorMinX !== Infinity
    ? (anchorMinX + anchorMaxX) / 2
    : pageLeftX + pageWidth / 2;
  const docAnchorCenterY = docHeadlineY + headlineLineHeight / 2; // constant — single line

  // Headline block extents: exactly ONE line tall, always.
  const blockTopY = docHeadlineY;
  const blockBottomY = docHeadlineY + headlineLineHeight;

  // ============================================================
  // CAMERA LOCK TRANSFORM — the anchor stays dead-center on screen.
  // Vertically constant by construction (single fixed line); horizontally
  // the camera tracks the anchor's own center, so the sentence may slide
  // left/right around the locked phrase — exactly the match-cut feel.
  // ============================================================
  ctx.save();

  const cameraPanX = targetCenterX - docAnchorCenterX;
  const cameraPanY = targetCenterY - docAnchorCenterY;

  ctx.translate(cameraPanX, cameraPanY);

  // Subtle organic print misregistration & micro-tilt
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
  // SECTION A: Dense Top Columns (Stage text above the headline line)
  // ------------------------------------------------------------
  if (options.showTopColumns !== false) {
    const topColumnsY = 40;
    const topColumnsBottomY = blockTopY - 145;
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
    const mastheadText = (cut.masthead || 'CREATOR KIT').toUpperCase();
    const mastheadY = blockTopY - 95;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.ink;
    ctx.font = `900 ${Math.max(16, Math.round(width * 0.024))}px "Playfair Display", Georgia, serif`;
    ctx.fillText(mastheadText, pageLeftX + pageWidth / 2, mastheadY);

    if (cut.dateString) {
      ctx.font = `bold ${Math.max(10, Math.round(width * 0.012))}px "Courier New", monospace`;
      ctx.fillStyle = theme.inkMuted;
      // The printed calendar date always shows TODAY's device date.
      ctx.fillText(applyTodayDateline(cut.dateString).toUpperCase(), pageLeftX + pageWidth / 2, mastheadY + 28);
    }

    // Thin double divider rules above the headline line
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
  // SECTION C: The Headline — one single line with the anchored phrase
  // ------------------------------------------------------------
  ctx.save();
  ctx.font = headlineFont;
  ctx.textBaseline = 'top';

  // 1. Anchor highlight chunks along the single line. Every chunk is a
  //    run of consecutive anchor words; each is swept by its phrase window.
  const chunks: { x: number; w: number; phraseIndex: number }[] = [];
  let groupStart = -1;
  let groupEnd = -1;
  let curPhrase = 0;
  words.forEach((w, i) => {
    if (w.isAnchor) {
      if (groupStart === -1) {
        groupStart = lineStartX + w.x;
        curPhrase = w.phraseIndex;
      } else if (w.phraseIndex !== curPhrase) {
        chunks.push({ x: groupStart, w: groupEnd - groupStart, phraseIndex: curPhrase });
        groupStart = lineStartX + w.x;
        curPhrase = w.phraseIndex;
      }
      groupEnd = lineStartX + w.x + w.w;
    } else if (groupStart !== -1) {
      chunks.push({ x: groupStart, w: groupEnd - groupStart, phraseIndex: curPhrase });
      groupStart = -1;
      groupEnd = -1;
    }
    if (i === words.length - 1 && groupStart !== -1) {
      chunks.push({ x: groupStart, w: groupEnd - groupStart, phraseIndex: curPhrase });
    }
  });

  const numPhrases = chunks.length > 0 ? Math.max(...chunks.map((c) => c.phraseIndex)) + 1 : 1;
  const isAnimated = options.animationMode === 'animated-highlight';
  const overallProgress = isAnimated ? Math.min(1, Math.max(0, options.highlightProgress ?? 1)) : 1;

  chunks.forEach((chunk) => {
    const pIdx = chunk.phraseIndex;
    const phraseWindowStart = pIdx / numPhrases;
    const phraseSweepEnd = (pIdx + (numPhrases > 1 ? 0.78 : 1.0)) / numPhrases;

    let chunkProg = 0;
    if (overallProgress >= phraseSweepEnd) {
      chunkProg = 1;
    } else if (overallProgress > phraseWindowStart) {
      chunkProg = (overallProgress - phraseWindowStart) / (phraseSweepEnd - phraseWindowStart);
    }

    drawAnchorHighlight(
      ctx,
      chunk.x,
      docHeadlineY + headlineFontSize * 0.5,
      chunk.w,
      headlineFontSize,
      { ...options, highlightProgress: chunkProg }
    );
  });

  // 2. Draw the single headline line.
  words.forEach((w) => {
    ctx.font = headlineFont;
    if (w.isAnchor && options.highlightStyle === 'box') {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = isDark ? '#ffffff' : theme.ink;
    }
    ctx.fillText(w.word, lineStartX + w.x, docHeadlineY);
  });

  ctx.restore();

  let afterHeadlineY = blockBottomY + 16;

  // Thin rule below headline
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
  // SECTION E: Dense Bottom Columns (Stage text below the headline line)
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

  ctx.restore(); // Restore camera lock transform

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

    const innerRadius = Math.min(width, height) * 0.18; // crystal-clear circular focal core
    const outerRadius = Math.max(width, height) * 0.55; // smooth circular falloff

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
