import { SlideItem } from './types';
import { CURATED_STUDIO_GRADIENTS } from './gradient-engine';

export interface CanvasRenderOptions {
  width: number;
  height: number;
  showCounter: boolean;
  counterPosition: 'top-right' | 'top-left' | 'bottom-center';
  counterStyle: 'pill' | 'minimal' | 'badge';
  showCategoryBadge: boolean;
  showEyebrow: boolean;
  showHeroTitle: boolean;
  showSubtitle: boolean;
  showAuthorBlock: boolean;
  showQuoteMarks: boolean;
  fontFamily: string;
  heroFontSize: number;
  textColor: string;
  accentColor: string;
  textAlign: 'center' | 'left' | 'right';
  bgBlur: number;
  bgDimness: number;
  bgGrain: number;
  bgVignette: number;
  isBold: boolean;
  isItalic: boolean;
  drawGuides?: boolean;
}

// Utility to draw smooth rounded rectangles
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// Helper: Measure and wrap text into lines
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine + ' ' + word;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

export function renderSlideToCanvas(
  canvas: HTMLCanvasElement,
  slide: SlideItem,
  slideNum: number,
  totalSlides: number,
  options: CanvasRenderOptions
) {
  const { width: W, height: H } = options;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ==========================================
  // 1. BACKGROUND RENDERING
  // ==========================================
  if (slide.bgType === 'photo' && slide.photoImgEl && slide.photoImgEl.complete) {
    ctx.save();
    if ((slide.bgBlur ?? options.bgBlur) > 0) {
      ctx.filter = `blur(${slide.bgBlur ?? options.bgBlur}px)`;
    }
    const imgRatio = slide.photoImgEl.naturalWidth / slide.photoImgEl.naturalHeight;
    const canvasRatio = W / H;
    let dw = W,
      dh = H,
      dx = 0,
      dy = 0;
    if (imgRatio > canvasRatio) {
      dh = H;
      dw = H * imgRatio;
      dx = (W - dw) / 2;
    } else {
      dw = W;
      dh = W / imgRatio;
      dy = (H - dh) / 2;
    }
    ctx.drawImage(slide.photoImgEl, dx, dy, dw, dh);
    ctx.restore();
  } else if (slide.bgType === 'solid') {
    ctx.fillStyle = slide.solidColor || '#0047FF';
    ctx.fillRect(0, 0, W, H);
  } else if (slide.bgType === 'graph-grid') {
    // Linen paper + subtle graph grid
    ctx.fillStyle = slide.solidColor || '#F4EFEA';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    const gSize = slide.gridSize || Math.round(W * 0.045);
    ctx.strokeStyle = slide.gridColor || 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= W; x += gSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = 0; y <= H; y += gSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
    ctx.restore();
  } else if (slide.bgType === 'halftone-dither') {
    // Obsidian / Retro Halftone
    ctx.fillStyle = slide.solidColor || '#12151B';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    const dotSpacing = Math.round(W * 0.026);
    const dotRadius = Math.max(1, Math.round(W * 0.0035));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    for (let x = dotSpacing / 2; x < W; x += dotSpacing) {
      for (let y = dotSpacing / 2; y < H; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  } else if (slide.bgType === 'custom-gradient') {
    const rad = ((slide.customGradAngle || 135) * Math.PI) / 180;
    const x1 = W / 2 - (Math.cos(rad) * W) / 2;
    const y1 = H / 2 - (Math.sin(rad) * H) / 2;
    const x2 = W / 2 + (Math.cos(rad) * W) / 2;
    const y2 = H / 2 + (Math.sin(rad) * H) / 2;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, slide.customGradColors[0]);
    grad.addColorStop(0.5, slide.customGradColors[1]);
    grad.addColorStop(1, slide.customGradColors[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (slide.bgType === 'mesh') {
    ctx.fillStyle = slide.meshPins[0]?.color || '#0B44CD';
    ctx.fillRect(0, 0, W, H);

    const warpSize = (slide.meshWarpSize || 75) / 100;
    ctx.save();
    slide.meshPins.forEach((node) => {
      const gradX = (node.x / 100) * W;
      const gradY = (node.y / 100) * H;
      const radius = warpSize * Math.max(W, H) * 0.9;

      const radial = ctx.createRadialGradient(gradX, gradY, 0, gradX, gradY, radius);
      radial.addColorStop(0, node.color);
      radial.addColorStop(0.55, `${node.color}cc`);
      radial.addColorStop(1, 'transparent');

      ctx.fillStyle = radial;
      ctx.globalAlpha = 0.88;
      ctx.fillRect(0, 0, W, H);
    });
    ctx.restore();
  } else {
    // Preset Gradient
    const preset =
      CURATED_STUDIO_GRADIENTS.find((g) => g.id === slide.presetGradientId) ||
      CURATED_STUDIO_GRADIENTS[0];

    const grad = ctx.createLinearGradient(0, 0, W, H);
    if (preset.colors.length >= 4) {
      grad.addColorStop(0, preset.colors[0]);
      grad.addColorStop(0.35, preset.colors[1]);
      grad.addColorStop(0.7, preset.colors[2]);
      grad.addColorStop(1, preset.colors[3]);
    } else {
      grad.addColorStop(0, preset.colors[0]);
      grad.addColorStop(1, preset.colors[preset.colors.length - 1]);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // Dim & Vignette
  const dimVal = slide.bgDimness ?? options.bgDimness;
  if (dimVal > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${dimVal / 100})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (options.bgVignette > 0) {
    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.85);
    vigGrad.addColorStop(0, 'transparent');
    vigGrad.addColorStop(1, `rgba(0, 0, 0, ${(options.bgVignette / 100) * 0.85})`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // Film Grain Noise
  if (options.bgGrain > 0) {
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = 240;
    grainCanvas.height = 240;
    const gCtx = grainCanvas.getContext('2d');
    if (gCtx) {
      const imgData = gCtx.createImageData(240, 240);
      for (let i = 0; i < imgData.data.length; i += 4) {
        const v = Math.random() * 255;
        imgData.data[i] = v;
        imgData.data[i + 1] = v;
        imgData.data[i + 2] = v;
        imgData.data[i + 3] = (options.bgGrain / 100) * 50;
      }
      gCtx.putImageData(imgData, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = ctx.createPattern(grainCanvas, 'repeat') || 'transparent';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  const padX = W * 0.08;
  const topY = H * 0.07;
  const bottomY = H * 0.91;
  const fontMain = slide.titleFontFamily || options.fontFamily || 'Inter';
  const bodyFont = slide.bodyFontFamily || 'Inter';
  const textColor = slide.textColor || options.textColor || '#ffffff';
  const accentColor = slide.accentColor || options.accentColor || '#FFE500';

  // ==========================================
  // 2. HEADER BAR & EYEBROWS (BRAND, BADGES)
  // ==========================================
  
  // Brand Logo Text / Icon (Top Left)
  if (slide.brandLogoText) {
    ctx.save();
    ctx.font = `800 ${Math.round(W * 0.026)}px '${bodyFont}', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // Draw small symbol or icon placeholder next to brand
    ctx.fillText(`${slide.brandLogoText} ✈`, padX, topY);
    ctx.restore();
  } else if (slide.categoryBadge) {
    ctx.save();
    ctx.font = `800 ${Math.round(W * 0.022)}px '${bodyFont}', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.85;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(slide.categoryBadge.toUpperCase(), padX, topY);
    ctx.restore();
  }

  // Top Tag Pill (e.g. "[ Click Here to Edit Files ]" like in Reference 1)
  if (slide.topTagPill) {
    ctx.save();
    const pillText = slide.topTagPill;
    ctx.font = `700 ${Math.round(W * 0.019)}px '${bodyFont}', sans-serif`;
    const textWidth = ctx.measureText(pillText).width;
    const pW = textWidth + 24;
    const pH = Math.round(W * 0.038);
    const pX = W - padX - pW;
    const pY = topY - pH / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    drawRoundedRect(ctx, pX, pY, pW, pH, 6);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pillText, pX + pW / 2, pY + pH / 2 + 1);
    ctx.restore();
  } else if (options.showCounter) {
    // Slide Counter Pill (Top Right)
    ctx.save();
    const counterStr = slide.sectionNumber || `${slideNum}/${totalSlides}`;
    const pillHeight = Math.round(W * 0.042);
    ctx.font = `900 ${Math.round(W * 0.022)}px monospace`;
    const pillWidth = ctx.measureText(counterStr).width + 24;
    const pillX = W - padX - pillWidth;
    const pillY = topY - pillHeight / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, pillX, pillY, pillWidth, pillHeight, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(counterStr, pillX + pillWidth / 2, pillY + pillHeight / 2 + 1);
    ctx.restore();
  }

  // ==========================================
  // 3. LAYOUT MODES & MULTI-IMAGE CANVAS DISPATCH
  // ==========================================

  // Determine effective layout mode
  const layout = slide.layoutMode || 'hero-hook';

  if (layout === 'hero-hook') {
    renderHeroHookLayout(ctx, slide, W, H, padX, topY, bottomY, fontMain, bodyFont, textColor, accentColor, options);
  } else if (layout === 'single-image') {
    renderSingleImageLayout(ctx, slide, W, H, padX, topY, bottomY, fontMain, bodyFont, textColor, accentColor, options);
  } else if (layout === 'dual-comparison') {
    renderDualComparisonLayout(ctx, slide, W, H, padX, topY, bottomY, fontMain, bodyFont, textColor, accentColor, options);
  } else if (layout === 'trio-gallery') {
    renderTrioGalleryLayout(ctx, slide, W, H, padX, topY, bottomY, fontMain, bodyFont, textColor, accentColor, options);
  } else if (layout === 'tweet-card') {
    renderTweetCardLayout(ctx, slide, W, H, padX, topY, bottomY, fontMain, bodyFont, textColor, accentColor, options);
  } else if (layout === 'editorial-quote') {
    renderEditorialQuoteLayout(ctx, slide, W, H, padX, topY, bottomY, fontMain, bodyFont, textColor, accentColor, options);
  } else if (layout === 'desktop-window') {
    renderDesktopWindowLayout(ctx, slide, W, H, padX, topY, bottomY, fontMain, bodyFont, textColor, accentColor, options);
  } else if (layout === 'mobile-phone') {
    renderMobilePhoneLayout(ctx, slide, W, H, padX, topY, bottomY, fontMain, bodyFont, textColor, accentColor, options);
  } else if (layout === 'color-swatches') {
    renderColorSwatchesLayout(ctx, slide, W, H, padX, topY, bottomY, fontMain, bodyFont, textColor, accentColor, options);
  }

  // ==========================================
  // 4. BOTTOM MICRO-COMPONENTS & SWIPE CUES
  // ==========================================
  renderSwipeCuesAndFooter(ctx, slide, W, H, padX, bottomY, bodyFont, textColor, accentColor, slideNum, totalSlides);
}

// ----------------------------------------------------
// LAYOUT 1: HERO HOOK (References 1 & 2)
// ----------------------------------------------------
function renderHeroHookLayout(
  ctx: CanvasRenderingContext2D,
  slide: SlideItem,
  W: number,
  H: number,
  padX: number,
  topY: number,
  bottomY: number,
  fontMain: string,
  bodyFont: string,
  textColor: string,
  accentColor: string,
  options: CanvasRenderOptions
) {
  let curY = topY + H * 0.08;

  // Eyebrow Tag (e.g. "UNLOCK LASTING RESULTS" or "3-Step Brand Clarity Filter")
  if (slide.eyebrowText) {
    ctx.save();
    ctx.font = `800 ${Math.round(W * 0.024)}px '${bodyFont}', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.75;
    ctx.textAlign = 'left';
    ctx.letterSpacing = '0.08em';
    ctx.fillText(slide.eyebrowText.toUpperCase(), padX, curY);
    ctx.restore();
    curY += H * 0.045;
  }

  // Main Headline with highlighted keyword pill
  const baseFontSize = Math.round(W * (slide.titleFontSize ? (slide.titleFontSize / 100) * 0.068 : 0.068));
  ctx.save();
  const fontStyle = slide.titleItalic ? 'italic ' : '';
  ctx.font = `${fontStyle}900 ${baseFontSize}px '${fontMain}', sans-serif`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';

  const maxTextWidth = W - padX * 2;
  const titleWords = (slide.heroTitle || '4 Strategies that drive AI Success').split(' ');
  const highlightWords = (slide.highlightWords || '').trim().toLowerCase();
  const secondaryBox = (slide.secondaryHighlightWords || '').trim().toLowerCase();

  // Multi-line rendering with inline highlight pills
  const lines: { text: string; words: string[] }[] = [];
  let curLineWords: string[] = [];
  let curLineText = '';

  for (const w of titleWords) {
    const test = curLineText ? curLineText + ' ' + w : w;
    if (ctx.measureText(test).width <= maxTextWidth) {
      curLineText = test;
      curLineWords.push(w);
    } else {
      if (curLineWords.length > 0) {
        lines.push({ text: curLineText, words: curLineWords });
      }
      curLineText = w;
      curLineWords = [w];
    }
  }
  if (curLineWords.length > 0) {
    lines.push({ text: curLineText, words: curLineWords });
  }

  const lineHeight = baseFontSize * 1.22;
  lines.forEach((lineObj) => {
    let wordX = padX;
    lineObj.words.forEach((w) => {
      const cleanW = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      const isHighlighted = highlightWords && (highlightWords.includes(cleanW) || cleanW.includes(highlightWords));
      const isBoxed = secondaryBox && (secondaryBox.includes(cleanW) || cleanW.includes(secondaryBox));

      const wWidth = ctx.measureText(w + ' ').width;
      const actualWordWidth = ctx.measureText(w).width;

      if (isHighlighted) {
        // Draw Highlight Pill
        const pillPadX = 14;
        const pillPadY = 6;
        const pillH = baseFontSize * 1.05;
        const pillW = actualWordWidth + pillPadX * 2;
        const pillY = curY - pillH * 0.82;

        ctx.save();
        ctx.fillStyle = slide.highlightBgColor || '#E05638';
        drawRoundedRect(ctx, wordX - pillPadX, pillY, pillW, pillH, 8);
        ctx.fill();

        ctx.fillStyle = slide.highlightTextColor || '#ffffff';
        ctx.fillText(w, wordX, curY);
        ctx.restore();
      } else if (isBoxed || slide.secondaryHighlightBox) {
        // Draw Dashed Selection Box (like "Graphic Designer" in reference 2)
        const boxPadX = 10;
        const boxPadY = 6;
        const boxH = baseFontSize * 1.1;
        const boxW = actualWordWidth + boxPadX * 2;
        const boxY = curY - boxH * 0.84;

        ctx.save();
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        drawRoundedRect(ctx, wordX - boxPadX, boxY, boxW, boxH, 4);
        ctx.stroke();

        // Little corner handles
        ctx.fillStyle = '#2563EB';
        ctx.fillRect(wordX - boxPadX - 4, boxY - 4, 8, 8);
        ctx.fillRect(wordX - boxPadX + boxW - 4, boxY - 4, 8, 8);
        ctx.fillRect(wordX - boxPadX - 4, boxY + boxH - 4, 8, 8);
        ctx.fillRect(wordX - boxPadX + boxW - 4, boxY + boxH - 4, 8, 8);

        ctx.fillStyle = textColor;
        ctx.fillText(w, wordX, curY);
        ctx.restore();
      } else {
        ctx.fillStyle = textColor;
        ctx.fillText(w, wordX, curY);
      }

      wordX += wWidth;
    });

    curY += lineHeight;
  });
  ctx.restore();

  // Subtitle / Takeaway text
  if (slide.subtitleText) {
    curY += H * 0.02;
    ctx.save();
    ctx.font = `500 ${Math.round(W * 0.028)}px '${bodyFont}', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.85;
    ctx.textAlign = 'left';

    const subLines = wrapText(ctx, slide.subtitleText, maxTextWidth);
    subLines.forEach((sLine) => {
      ctx.fillText(sLine, padX, curY);
      curY += Math.round(W * 0.038);
    });
    ctx.restore();
  }

  // Optional Dotted Divider Line (Reference 2)
  if (slide.dottedDivider) {
    curY += H * 0.03;
    ctx.save();
    ctx.strokeStyle = textColor;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(padX, curY);
    ctx.lineTo(W - padX, curY);
    ctx.stroke();
    ctx.restore();
  }
}

// ----------------------------------------------------
// LAYOUT 2: SINGLE IMAGE (Screenshot / Photo Slot)
// ----------------------------------------------------
function renderSingleImageLayout(
  ctx: CanvasRenderingContext2D,
  slide: SlideItem,
  W: number,
  H: number,
  padX: number,
  topY: number,
  bottomY: number,
  fontMain: string,
  bodyFont: string,
  textColor: string,
  accentColor: string,
  options: CanvasRenderOptions
) {
  let curY = topY + H * 0.06;

  // Title at the top
  if (slide.heroTitle) {
    ctx.save();
    ctx.font = `900 ${Math.round(W * 0.052)}px '${fontMain}', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    const lines = wrapText(ctx, slide.heroTitle, W - padX * 2);
    lines.forEach((l) => {
      ctx.fillText(l, padX, curY);
      curY += Math.round(W * 0.062);
    });
    ctx.restore();
  }

  curY += H * 0.02;

  // Image Frame Slot
  const imgBoxW = W - padX * 2;
  const imgBoxH = bottomY - curY - H * 0.12;
  const imgSlot = slide.images?.[0];

  ctx.save();
  // Draw card container with border and drop shadow
  ctx.fillStyle = '#181A20';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, padX, curY, imgBoxW, imgBoxH, 12);
  ctx.fill();
  ctx.stroke();

  if (imgSlot?.imgEl && imgSlot.imgEl.complete) {
    ctx.save();
    drawRoundedRect(ctx, padX, curY, imgBoxW, imgBoxH, 12);
    ctx.clip();

    const nw = imgSlot.imgEl.naturalWidth;
    const nh = imgSlot.imgEl.naturalHeight;
    const iRatio = nw / nh;
    const bRatio = imgBoxW / imgBoxH;
    let dw = imgBoxW,
      dh = imgBoxH,
      dx = padX,
      dy = curY;

    if (imgSlot.fit === 'contain') {
      if (iRatio > bRatio) {
        dh = imgBoxW / iRatio;
        dy = curY + (imgBoxH - dh) / 2;
      } else {
        dw = imgBoxH * iRatio;
        dx = padX + (imgBoxW - dw) / 2;
      }
    } else {
      if (iRatio > bRatio) {
        dw = imgBoxH * iRatio;
        dx = padX + (imgBoxW - dw) / 2;
      } else {
        dh = imgBoxW / iRatio;
        dy = curY + (imgBoxH - dh) / 2;
      }
    }
    ctx.drawImage(imgSlot.imgEl, dx, dy, dw, dh);
    ctx.restore();
  } else {
    // Placeholder Graphic when no image is uploaded
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.font = `700 ${Math.round(W * 0.028)}px '${bodyFont}', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🖼️ Click Image Slot or Drop Screenshot Here', padX + imgBoxW / 2, curY + imgBoxH / 2);
  }

  // Label Badge on Image
  if (imgSlot?.label) {
    ctx.save();
    ctx.font = `800 ${Math.round(W * 0.02)}px '${bodyFont}', sans-serif`;
    const labelW = ctx.measureText(imgSlot.label).width + 20;
    const labelH = Math.round(W * 0.038);
    drawRoundedRect(ctx, padX + 16, curY + 16, labelW, labelH, 6);
    ctx.fillStyle = '#FFE500';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(imgSlot.label, padX + 16 + labelW / 2, curY + 16 + labelH / 2 + 1);
    ctx.restore();
  }

  ctx.restore();
}

// ----------------------------------------------------
// LAYOUT 3: DUAL COMPARISON (Side-by-Side Before / After)
// ----------------------------------------------------
function renderDualComparisonLayout(
  ctx: CanvasRenderingContext2D,
  slide: SlideItem,
  W: number,
  H: number,
  padX: number,
  topY: number,
  bottomY: number,
  fontMain: string,
  bodyFont: string,
  textColor: string,
  accentColor: string,
  options: CanvasRenderOptions
) {
  let curY = topY + H * 0.06;

  // Title
  if (slide.heroTitle) {
    ctx.save();
    ctx.font = `900 ${Math.round(W * 0.05)}px '${fontMain}', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    const lines = wrapText(ctx, slide.heroTitle, W - padX * 2);
    lines.forEach((l) => {
      ctx.fillText(l, padX, curY);
      curY += Math.round(W * 0.06);
    });
    ctx.restore();
  }

  curY += H * 0.025;

  const gap = 20;
  const totalW = W - padX * 2;
  const cardW = (totalW - gap) / 2;
  const cardH = bottomY - curY - H * 0.12;

  const slots = [
    { slot: slide.images?.[0], defaultLabel: 'BEFORE', defaultBg: '#181920' },
    { slot: slide.images?.[1], defaultLabel: 'AFTER', defaultBg: '#12141A' },
  ];

  slots.forEach((item, idx) => {
    const cX = padX + idx * (cardW + gap);
    const cY = curY;

    ctx.save();
    // Card Box
    ctx.fillStyle = item.defaultBg;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, cX, cY, cardW, cardH, 10);
    ctx.fill();
    ctx.stroke();

    if (item.slot?.imgEl && item.slot.imgEl.complete) {
      ctx.save();
      drawRoundedRect(ctx, cX, cY, cardW, cardH, 10);
      ctx.clip();
      ctx.drawImage(item.slot.imgEl, cX, cY, cardW, cardH);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.font = `700 ${Math.round(W * 0.022)}px '${bodyFont}', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(idx === 0 ? 'Image Slot 1' : 'Image Slot 2', cX + cardW / 2, cY + cardH / 2);
    }

    // Top Label (e.g. BEFORE / AFTER)
    const labelText = item.slot?.label || item.defaultLabel;
    ctx.font = `900 ${Math.round(W * 0.02)}px '${bodyFont}', sans-serif`;
    const lW = ctx.measureText(labelText).width + 20;
    const lH = Math.round(W * 0.038);

    drawRoundedRect(ctx, cX + 12, cY + 12, lW, lH, 4);
    ctx.fillStyle = idx === 0 ? '#FF4757' : '#2ED573';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, cX + 12 + lW / 2, cY + 12 + lH / 2 + 1);

    ctx.restore();
  });
}

// ----------------------------------------------------
// LAYOUT 4: TRIO GALLERY (3 Images Grid/Row)
// ----------------------------------------------------
function renderTrioGalleryLayout(
  ctx: CanvasRenderingContext2D,
  slide: SlideItem,
  W: number,
  H: number,
  padX: number,
  topY: number,
  bottomY: number,
  fontMain: string,
  bodyFont: string,
  textColor: string,
  accentColor: string,
  options: CanvasRenderOptions
) {
  let curY = topY + H * 0.06;

  if (slide.heroTitle) {
    ctx.save();
    ctx.font = `900 ${Math.round(W * 0.048)}px '${fontMain}', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    const lines = wrapText(ctx, slide.heroTitle, W - padX * 2);
    lines.forEach((l) => {
      ctx.fillText(l, padX, curY);
      curY += Math.round(W * 0.058);
    });
    ctx.restore();
  }

  curY += H * 0.03;

  const gap = 16;
  const totalW = W - padX * 2;
  const cardW = (totalW - gap * 2) / 3;
  const cardH = bottomY - curY - H * 0.12;

  for (let i = 0; i < 3; i++) {
    const cX = padX + i * (cardW + gap);
    const slot = slide.images?.[i];

    ctx.save();
    ctx.fillStyle = '#16181F';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, cX, curY, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();

    if (slot?.imgEl && slot.imgEl.complete) {
      ctx.save();
      drawRoundedRect(ctx, cX, curY, cardW, cardH, 8);
      ctx.clip();
      ctx.drawImage(slot.imgEl, cX, curY, cardW, cardH);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.font = `700 ${Math.round(W * 0.018)}px '${bodyFont}', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Step 0${i + 1}`, cX + cardW / 2, curY + cardH / 2);
    }

    // Step Number Badge
    const stepLabel = slot?.label || `0${i + 1}`;
    ctx.font = `900 ${Math.round(W * 0.018)}px monospace`;
    const sW = ctx.measureText(stepLabel).width + 16;
    const sH = Math.round(W * 0.034);

    drawRoundedRect(ctx, cX + 10, curY + 10, sW, sH, 4);
    ctx.fillStyle = '#FFE500';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stepLabel, cX + 10 + sW / 2, curY + 10 + sH / 2 + 1);

    ctx.restore();
  }
}

// ----------------------------------------------------
// LAYOUT 5: TWEET / NOTES CARD (Reference 3)
// ----------------------------------------------------
function renderTweetCardLayout(
  ctx: CanvasRenderingContext2D,
  slide: SlideItem,
  W: number,
  H: number,
  padX: number,
  topY: number,
  bottomY: number,
  fontMain: string,
  bodyFont: string,
  textColor: string,
  accentColor: string,
  options: CanvasRenderOptions
) {
  let curY = topY + H * 0.06;

  // Author Profile Chip
  const avSize = Math.round(W * 0.068);
  ctx.save();

  if (slide.avatarImgEl && slide.avatarImgEl.complete) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(padX + avSize / 2, curY + avSize / 2, avSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(slide.avatarImgEl, padX, curY, avSize, avSize);
    ctx.restore();
  } else {
    ctx.fillStyle = '#FFE500';
    ctx.beginPath();
    ctx.arc(padX + avSize / 2, curY + avSize / 2, avSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = `900 ${Math.round(W * 0.028)}px '${bodyFont}', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((slide.authorName || 'CK')[0].toUpperCase(), padX + avSize / 2, curY + avSize / 2);
  }

  // Name & Handle
  const nameX = padX + avSize + 16;
  ctx.font = `800 ${Math.round(W * 0.026)}px '${bodyFont}', sans-serif`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  ctx.fillText(slide.authorName || 'Justas Markus', nameX, curY + avSize * 0.35);

  // Verified Badge Checkmark
  if (slide.authorVerified) {
    const nameW = ctx.measureText(slide.authorName || 'Justas Markus').width;
    ctx.fillStyle = '#1D9BF0';
    ctx.beginPath();
    ctx.arc(nameX + nameW + 14, curY + avSize * 0.35 - 1, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 10px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('✓', nameX + nameW + 14, curY + avSize * 0.35 + 2);
  }

  ctx.font = `500 ${Math.round(W * 0.021)}px '${bodyFont}', sans-serif`;
  ctx.fillStyle = textColor;
  ctx.globalAlpha = 0.65;
  ctx.fillText(slide.authorHandle || '@JustasMarkus', nameX, curY + avSize * 0.78);
  ctx.restore();

  curY += avSize + H * 0.06;

  // Main Tweet Statement
  const baseFontSize = Math.round(W * 0.062);
  ctx.save();
  ctx.font = `900 ${baseFontSize}px '${fontMain}', sans-serif`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';

  const lines = wrapText(ctx, slide.heroTitle || 'Scaling With AI Planning', W - padX * 2);
  lines.forEach((l) => {
    ctx.fillText(l, padX, curY);
    curY += baseFontSize * 1.25;
  });

  // Highlight pill tag below or inside
  if (slide.highlightWords) {
    curY += H * 0.02;
    ctx.font = `700 ${Math.round(W * 0.03)}px '${bodyFont}', sans-serif`;
    const hText = slide.highlightWords;
    const hW = ctx.measureText(hText).width + 24;
    const hH = Math.round(W * 0.048);

    ctx.fillStyle = slide.highlightBgColor || '#2563EB';
    drawRoundedRect(ctx, padX, curY, hW, hH, 6);
    ctx.fill();

    ctx.fillStyle = slide.highlightTextColor || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hText, padX + hW / 2, curY + hH / 2 + 1);
  }
  ctx.restore();
}

// ----------------------------------------------------
// LAYOUT 6: EDITORIAL QUOTE (Paper & Quotation Marks)
// ----------------------------------------------------
function renderEditorialQuoteLayout(
  ctx: CanvasRenderingContext2D,
  slide: SlideItem,
  W: number,
  H: number,
  padX: number,
  topY: number,
  bottomY: number,
  fontMain: string,
  bodyFont: string,
  textColor: string,
  accentColor: string,
  options: CanvasRenderOptions
) {
  let curY = topY + H * 0.1;

  // Giant Quotation Marks
  ctx.save();
  ctx.font = `900 ${Math.round(W * 0.16)}px 'Playfair Display', serif`;
  ctx.fillStyle = accentColor;
  ctx.globalAlpha = 0.45;
  ctx.fillText('“', padX - 10, curY);
  ctx.restore();

  curY += H * 0.05;

  // Quote Text
  ctx.save();
  ctx.font = `700 ${Math.round(W * 0.056)}px '${fontMain}', serif`;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';

  const lines = wrapText(ctx, slide.heroTitle || 'Consistency Over Creativity', W - padX * 2);
  lines.forEach((l) => {
    ctx.fillText(l, padX, curY);
    curY += Math.round(W * 0.07);
  });
  ctx.restore();

  // Subtitle / Meaning
  if (slide.subtitleText) {
    curY += H * 0.03;
    ctx.save();
    ctx.font = `400 ${Math.round(W * 0.03)}px '${bodyFont}', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.85;
    const sLines = wrapText(ctx, slide.subtitleText, W - padX * 2);
    sLines.forEach((sl) => {
      ctx.fillText(sl, padX, curY);
      curY += Math.round(W * 0.042);
    });
    ctx.restore();
  }
}

// ----------------------------------------------------
// LAYOUT 7: DESKTOP MAC WINDOW MOCKUP
// ----------------------------------------------------
function renderDesktopWindowLayout(
  ctx: CanvasRenderingContext2D,
  slide: SlideItem,
  W: number,
  H: number,
  padX: number,
  topY: number,
  bottomY: number,
  fontMain: string,
  bodyFont: string,
  textColor: string,
  accentColor: string,
  options: CanvasRenderOptions
) {
  let curY = topY + H * 0.06;

  // Title
  if (slide.heroTitle) {
    ctx.save();
    ctx.font = `900 ${Math.round(W * 0.048)}px '${fontMain}', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    const lines = wrapText(ctx, slide.heroTitle, W - padX * 2);
    lines.forEach((l) => {
      ctx.fillText(l, padX, curY);
      curY += Math.round(W * 0.058);
    });
    ctx.restore();
  }

  curY += H * 0.02;

  // Mac Window Chrome
  const winW = W - padX * 2;
  const winH = bottomY - curY - H * 0.12;
  const barH = Math.round(W * 0.046);

  ctx.save();
  ctx.fillStyle = '#1A1C23';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, padX, curY, winW, winH, 12);
  ctx.fill();
  ctx.stroke();

  // Traffic lights
  const dotY = curY + barH / 2;
  ['#FF5F56', '#FFBD2E', '#27C93F'].forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(padX + 20 + i * 18, dotY, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // URL Pill in center
  const urlW = Math.round(winW * 0.45);
  const urlH = barH * 0.65;
  const urlX = padX + (winW - urlW) / 2;
  const urlY = curY + (barH - urlH) / 2;
  drawRoundedRect(ctx, urlX, urlY, urlW, urlH, 4);
  ctx.fillStyle = '#0F1015';
  ctx.fill();

  ctx.fillStyle = '#888888';
  ctx.font = `700 ${Math.round(W * 0.016)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔒 creatorkit.studio', urlX + urlW / 2, urlY + urlH / 2 + 1);

  // Screen content
  const screenY = curY + barH;
  const screenH = winH - barH;
  const slot = slide.images?.[0];

  if (slot?.imgEl && slot.imgEl.complete) {
    ctx.save();
    drawRoundedRect(ctx, padX, screenY, winW, screenH, 0);
    ctx.clip();
    ctx.drawImage(slot.imgEl, padX, screenY, winW, screenH);
    ctx.restore();
  } else {
    // Default mock graphic
    ctx.fillStyle = '#101216';
    ctx.fillRect(padX, screenY, winW, screenH);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = `700 ${Math.round(W * 0.024)}px '${bodyFont}', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ Drop App Screenshot into Slot', padX + winW / 2, screenY + screenH / 2);
  }

  ctx.restore();
}

// ----------------------------------------------------
// LAYOUT 8: MOBILE PHONE MOCKUP
// ----------------------------------------------------
function renderMobilePhoneLayout(
  ctx: CanvasRenderingContext2D,
  slide: SlideItem,
  W: number,
  H: number,
  padX: number,
  topY: number,
  bottomY: number,
  fontMain: string,
  bodyFont: string,
  textColor: string,
  accentColor: string,
  options: CanvasRenderOptions
) {
  let curY = topY + H * 0.06;

  if (slide.heroTitle) {
    ctx.save();
    ctx.font = `900 ${Math.round(W * 0.048)}px '${fontMain}', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    const lines = wrapText(ctx, slide.heroTitle, W - padX * 2);
    lines.forEach((l) => {
      ctx.fillText(l, padX, curY);
      curY += Math.round(W * 0.058);
    });
    ctx.restore();
  }

  curY += H * 0.02;

  const phoneW = Math.round(W * 0.55);
  const phoneH = bottomY - curY - H * 0.12;
  const phoneX = (W - phoneW) / 2;

  ctx.save();
  // Phone Body
  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, phoneX, curY, phoneW, phoneH, 28);
  ctx.fill();
  ctx.stroke();

  // Dynamic Island Notch
  const notchW = phoneW * 0.35;
  const notchH = 14;
  drawRoundedRect(ctx, phoneX + (phoneW - notchW) / 2, curY + 12, notchW, notchH, 7);
  ctx.fillStyle = '#1A1A1A';
  ctx.fill();

  // Screen
  const screenPad = 10;
  const sX = phoneX + screenPad;
  const sY = curY + screenPad;
  const sW = phoneW - screenPad * 2;
  const sH = phoneH - screenPad * 2;

  const slot = slide.images?.[0];
  if (slot?.imgEl && slot.imgEl.complete) {
    ctx.save();
    drawRoundedRect(ctx, sX, sY, sW, sH, 20);
    ctx.clip();
    ctx.drawImage(slot.imgEl, sX, sY, sW, sH);
    ctx.restore();
  } else {
    ctx.fillStyle = '#15171E';
    drawRoundedRect(ctx, sX, sY, sW, sH, 20);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = `700 ${Math.round(W * 0.02)}px '${bodyFont}', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📱 Mobile Screen Slot', sX + sW / 2, sY + sH / 2);
  }

  ctx.restore();
}

// ----------------------------------------------------
// LAYOUT 9: COLOR HARMONY SWATCHES
// ----------------------------------------------------
function renderColorSwatchesLayout(
  ctx: CanvasRenderingContext2D,
  slide: SlideItem,
  W: number,
  H: number,
  padX: number,
  topY: number,
  bottomY: number,
  fontMain: string,
  bodyFont: string,
  textColor: string,
  accentColor: string,
  options: CanvasRenderOptions
) {
  let curY = topY + H * 0.06;

  if (slide.heroTitle) {
    ctx.save();
    ctx.font = `900 ${Math.round(W * 0.05)}px '${fontMain}', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    const lines = wrapText(ctx, slide.heroTitle, W - padX * 2);
    lines.forEach((l) => {
      ctx.fillText(l, padX, curY);
      curY += Math.round(W * 0.06);
    });
    ctx.restore();
  }

  curY += H * 0.04;

  const swatches = slide.colorSwatches || [
    { name: 'Cobalt Energy', hex: '#0047FF', desc: 'Trust & Innovation' },
    { name: 'Electric Cyan', hex: '#00E5FF', desc: 'Clarity & Modernity' },
    { name: 'Warm Cream', hex: '#F4EFEA', desc: 'Editorial Texture' },
    { name: 'Golden Marigold', hex: '#FFB800', desc: 'Attention & Action' },
    { name: 'Deep Obsidian', hex: '#12151B', desc: 'Luxury Contrast' },
  ];

  const sH = Math.round(W * 0.082);
  const gap = 12;

  swatches.forEach((sw) => {
    ctx.save();
    // Swatch box
    drawRoundedRect(ctx, padX, curY, W - padX * 2, sH, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Color Swatch square
    const boxSize = sH - 16;
    drawRoundedRect(ctx, padX + 8, curY + 8, boxSize, boxSize, 6);
    ctx.fillStyle = sw.hex;
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Swatch Name & Hex
    ctx.font = `900 ${Math.round(W * 0.024)}px '${bodyFont}', sans-serif`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(sw.name, padX + boxSize + 22, curY + sH * 0.38);

    ctx.font = `700 ${Math.round(W * 0.02)}px monospace`;
    ctx.fillStyle = '#555555';
    ctx.fillText(sw.hex.toUpperCase() + (sw.desc ? ` · ${sw.desc}` : ''), padX + boxSize + 22, curY + sH * 0.72);

    ctx.restore();
    curY += sH + gap;
  });
}

// ----------------------------------------------------
// 4. FOOTER & SWIPE MICRO-COMPONENTS
// ----------------------------------------------------
function renderSwipeCuesAndFooter(
  ctx: CanvasRenderingContext2D,
  slide: SlideItem,
  W: number,
  H: number,
  padX: number,
  bottomY: number,
  bodyFont: string,
  textColor: string,
  accentColor: string,
  slideNum: number,
  totalSlides: number
) {
  const swipeType = slide.swipePromptType || 'search-bar';

  if (swipeType === 'connected-arc') {
    // Sweeping connected curved arc across the bottom (Reference 1)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(padX, bottomY);
    ctx.bezierCurveTo(W * 0.4, bottomY, W * 0.7, bottomY - H * 0.06, W - padX - 30, bottomY - H * 0.1);
    ctx.stroke();

    // Little node star or circle at end
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(W - padX - 30, bottomY - H * 0.1, 5, 0, Math.PI * 2);
    ctx.fill();

    // Bottom segmented step indicators
    const segW = Math.round(W * 0.06);
    const segGap = 8;
    const startX = padX;
    for (let i = 0; i < totalSlides; i++) {
      ctx.fillStyle = i < slideNum ? '#ffffff' : 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(startX + i * (segW + segGap), bottomY + 12, segW, 3);
    }

    // Circular arrow button in bottom right
    const btnSize = Math.round(W * 0.052);
    const btnX = W - padX - btnSize;
    const btnY = bottomY - btnSize / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(btnX + btnSize / 2, btnY + btnSize / 2, btnSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(W * 0.024)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('➔', btnX + btnSize / 2, btnY + btnSize / 2);
    ctx.restore();
  } else if (swipeType === 'search-bar') {
    // Search Bar Mockup (Reference 1)
    const barW = W - padX * 2;
    const barH = Math.round(W * 0.052);
    const barY = bottomY - barH / 2;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, padX, barY, barW, barH, barH / 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Search Icon & text
    ctx.fillStyle = '#555555';
    ctx.font = `700 ${Math.round(W * 0.022)}px '${bodyFont}', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🔍  ${slide.swipeSearchPlaceholder || "I'm looking for..."}`, padX + 18, barY + barH / 2 + 1);

    // Blue circle arrow on right
    const arrowRadius = barH * 0.38;
    const arrowX = padX + barW - arrowRadius - 8;
    const arrowY = barY + barH / 2;

    ctx.fillStyle = '#0047FF';
    ctx.beginPath();
    ctx.arc(arrowX, arrowY, arrowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(W * 0.02)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('➔', arrowX, arrowY);
    ctx.restore();
  } else if (swipeType === 'notes-folder') {
    // Folder Button (Reference 3)
    const pillW = Math.round(W * 0.42);
    const pillH = Math.round(W * 0.052);
    const pillY = bottomY - pillH / 2;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, padX, pillY, pillW, pillH, 8);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = `800 ${Math.round(W * 0.02)}px '${bodyFont}', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(slide.swipePromptSubtext || '📁 Swipe to view notes 4 >', padX + pillW / 2, pillY + pillH / 2 + 1);
    ctx.restore();
  } else if (swipeType === 'pill-arrow') {
    // Minimal SWIPE Pill (Reference 2)
    const pillW = Math.round(W * 0.22);
    const pillH = Math.round(W * 0.046);
    const pillX = W - padX - pillW;
    const pillY = bottomY - pillH / 2;

    ctx.save();
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = `900 ${Math.round(W * 0.02)}px '${bodyFont}', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(slide.swipePromptText || 'SWIPE ➔', pillX + pillW / 2, pillY + pillH / 2 + 1);
    ctx.restore();
  } else if (swipeType === 'minimal-arrow') {
    // Line arrow with watermark (Reference 4)
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.75;
    ctx.font = `800 ${Math.round(W * 0.022)}px '${bodyFont}', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(slide.watermarkText || 'creatorkit.studio', padX, bottomY);

    // Arrow line
    const startX = padX + ctx.measureText(slide.watermarkText || 'creatorkit.studio').width + 20;
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, bottomY);
    ctx.lineTo(W - padX, bottomY);
    ctx.lineTo(W - padX - 10, bottomY - 6);
    ctx.moveTo(W - padX, bottomY);
    ctx.lineTo(W - padX - 10, bottomY + 6);
    ctx.stroke();
    ctx.restore();
  }
}
