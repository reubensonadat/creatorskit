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
  showLinkPill: boolean;
  showAuthorBlock: boolean;
  showQuoteMarks: boolean;
  fontFamily: string;
  eyebrowFontFamily: string;
  heroFontSize: number;
  textColor: string;
  accentColor: string;
  textAlign: 'center' | 'left' | 'right';
  textVerticalPos: 'center' | 'top' | 'bottom';
  bgBlur: number;
  bgDimness: number;
  bgGrain: number;
  bgVignette: number;
  isBold: boolean;
  isItalic: boolean;
  drawGuides?: boolean;
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

  // 1. BACKGROUND LAYER
  if (slide.bgType === 'photo' && slide.photoImgEl && slide.photoImgEl.complete) {
    ctx.save();
    if (options.bgBlur > 0) ctx.filter = `blur(${options.bgBlur}px)`;
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
    ctx.fillStyle = slide.solidColor || '#09090b';
    ctx.fillRect(0, 0, W, H);
  } else if (slide.bgType === 'graph-grid') {
    // Technical Graphic Grid (Editorial style)
    ctx.fillStyle = slide.solidColor || '#FDFBF7';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    const gSize = slide.gridSize || Math.round(W * 0.04);
    ctx.strokeStyle = slide.gridColor || 'rgba(0, 0, 0, 0.07)';
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
    // Retro Halftone Dither Texture
    ctx.fillStyle = slide.solidColor || '#18181B';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    const dotSpacing = Math.round(W * 0.024);
    const dotRadius = Math.max(1, Math.round(W * 0.0035));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
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
    // Fluid Organic Mesh Generator
    ctx.fillStyle = slide.meshPins[0]?.color || '#09090b';
    ctx.fillRect(0, 0, W, H);

    const warpSize = (slide.meshWarpSize || 75) / 100;
    const diffusion = slide.meshDiffusion || 65;

    ctx.save();
    slide.meshPins.forEach((node) => {
      const gradX = (node.x / 100) * W;
      const gradY = (node.y / 100) * H;
      const radius = warpSize * Math.max(W, H) * 0.9;

      const radial = ctx.createRadialGradient(gradX, gradY, 0, gradX, gradY, radius);
      radial.addColorStop(0, node.color);
      radial.addColorStop(0.5, `${node.color}cc`);
      radial.addColorStop(1, 'transparent');

      ctx.fillStyle = radial;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(0, 0, W, H);
    });
    ctx.restore();
  } else {
    // Preset Gradient Mode
    const preset =
      CURATED_STUDIO_GRADIENTS.find((g) => g.id === slide.presetGradientId) ||
      CURATED_STUDIO_GRADIENTS[0];

    if (preset.meshNodes && preset.meshNodes.length > 0) {
      ctx.fillStyle = preset.colors[0] || '#09090B';
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      preset.meshNodes.forEach((node) => {
        const gradX = (node.x / 100) * W;
        const gradY = (node.y / 100) * H;
        const radius = 0.75 * Math.max(W, H);

        const radial = ctx.createRadialGradient(gradX, gradY, 0, gradX, gradY, radius);
        radial.addColorStop(0, node.color);
        radial.addColorStop(0.6, `${node.color}aa`);
        radial.addColorStop(1, 'transparent');

        ctx.fillStyle = radial;
        ctx.globalAlpha = 0.88;
        ctx.fillRect(0, 0, W, H);
      });
      ctx.restore();
    } else {
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
  }

  // 2. DIM & VIGNETTE OVERLAYS
  if (options.bgDimness > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${options.bgDimness / 100})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (options.bgVignette > 0) {
    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.85);
    vigGrad.addColorStop(0, 'transparent');
    vigGrad.addColorStop(1, `rgba(0, 0, 0, ${(options.bgVignette / 100) * 0.85})`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // 3. FILM GRAIN NOISE TEXTURE
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
        imgData.data[i + 3] = (options.bgGrain / 100) * 55;
      }
      gCtx.putImageData(imgData, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = ctx.createPattern(grainCanvas, 'repeat') || 'transparent';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  const padX = W * 0.075;
  const topY = H * 0.065;

  // 4. TOP CATEGORY BADGE
  if (options.showCategoryBadge && slide.categoryBadge) {
    ctx.save();
    ctx.font = `800 ${Math.round(W * 0.024)}px 'Inter', sans-serif`;
    ctx.fillStyle = options.textColor;
    ctx.globalAlpha = 0.85;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(slide.categoryBadge.toUpperCase(), padX, topY);
    ctx.restore();
  }

  // 5. SLIDE COUNTER
  if (options.showCounter) {
    ctx.save();
    const counterStr = `${slideNum}/${totalSlides}`;
    const pillHeight = Math.round(W * 0.046);
    ctx.font = `900 ${Math.round(W * 0.023)}px monospace`;
    const pillWidth = ctx.measureText(counterStr).width + 26;

    let pillX = W - padX - pillWidth;
    let pillY = topY - pillHeight / 2;

    if (options.counterPosition === 'top-left') {
      pillX = padX;
    } else if (options.counterPosition === 'bottom-center') {
      pillX = (W - pillWidth) / 2;
      pillY = H * 0.92;
    }

    if (options.counterStyle === 'pill') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
    } else if (options.counterStyle === 'badge') {
      ctx.fillStyle = options.accentColor;
      ctx.fillRect(pillX, pillY, pillWidth, pillHeight);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(pillX, pillY, pillWidth, pillHeight);
      ctx.fillStyle = '#000000';
    } else {
      // Minimal
      ctx.fillStyle = options.textColor;
      ctx.globalAlpha = 0.75;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(counterStr, pillX + pillWidth / 2, pillY + pillHeight / 2);
    ctx.restore();
  }

  // 6. GIANT QUOTE MARKS
  if (options.showQuoteMarks) {
    ctx.save();
    ctx.font = `italic 900 ${Math.round(W * 0.16)}px 'Playfair Display', serif`;
    ctx.fillStyle = options.textColor;
    ctx.globalAlpha = 0.2;
    ctx.textAlign = options.textAlign === 'center' ? 'center' : 'left';
    ctx.textBaseline = 'top';
    const qX = options.textAlign === 'center' ? W / 2 : padX;
    ctx.fillText('“', qX, H * 0.14);
    ctx.restore();
  }

  // 7. ASSET / MOCKUP FRAME LAYER
  let contentAreaTop = H * 0.14;
  let contentAreaBottom = H * 0.82;

  if (slide.assetFrameType === 'desktop-window') {
    // --- DESKTOP BROWSER WINDOW MOCKUP (Craftwork / Originkit / MiroMiro Style) ---
    let headerY = H * 0.14;

    // Eyebrow if present
    if (options.showEyebrow && slide.eyebrowText) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `700 ${Math.round(W * 0.038)}px '${options.eyebrowFontFamily}', cursive, sans-serif`;
      ctx.fillStyle = options.accentColor;
      ctx.fillText(slide.eyebrowText, W / 2, headerY);
      headerY += Math.round(W * 0.05);
      ctx.restore();
    }

    // Hero title above browser window
    if (options.showHeroTitle && slide.heroTitle) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `${options.isBold ? '900' : '700'} ${Math.round(options.heroFontSize * 0.85)}px '${options.fontFamily}', sans-serif`;
      ctx.fillStyle = options.textColor;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;

      drawHighlightedText(ctx, slide.heroTitle, slide.highlightWords, W / 2, headerY, options.accentColor, options.textColor, W * 0.86);
      headerY += Math.round(options.heroFontSize * 1.1);
      ctx.restore();
    }

    // Subtitle
    if (options.showSubtitle && slide.subtitleText) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `600 ${Math.round(W * 0.032)}px '${options.fontFamily}', sans-serif`;
      ctx.fillStyle = options.textColor;
      ctx.globalAlpha = 0.85;
      ctx.fillText(slide.subtitleText, W / 2, headerY);
      headerY += Math.round(W * 0.048);
      ctx.restore();
    }

    // Window Frame Dimensions
    const winWidth = W * 0.86;
    const winHeight = H * 0.52;
    const winX = (W - winWidth) / 2;
    const winY = headerY + 14;
    const isDarkWin = slide.windowTheme === 'dark' || slide.windowTheme === 'cyber';

    // Outer Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = isDarkWin ? '#18181B' : '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(winX, winY, winWidth, winHeight, 16);
    ctx.fill();
    ctx.restore();

    // Window Border
    ctx.save();
    ctx.strokeStyle = isDarkWin ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Header bar with traffic lights
    const barHeight = Math.round(winHeight * 0.095);
    ctx.save();
    ctx.fillStyle = isDarkWin ? '#27272A' : '#F4F4F5';
    ctx.beginPath();
    ctx.roundRect(winX, winY, winWidth, barHeight, [16, 16, 0, 0]);
    ctx.fill();

    // 🔴 🟡 🟢 Traffic Lights
    const dotRadius = 5.5;
    const dotY = winY + barHeight / 2;
    const dotStartX = winX + 20;
    ctx.fillStyle = '#FF5F56';
    ctx.beginPath();
    ctx.arc(dotStartX, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFBD2E';
    ctx.beginPath();
    ctx.arc(dotStartX + 16, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#27C93F';
    ctx.beginPath();
    ctx.arc(dotStartX + 32, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // URL / App Title Pill inside header
    const pillH = barHeight * 0.65;
    const pillW = winWidth * 0.42;
    const pX = (winWidth - pillW) / 2 + winX;
    const pY = dotY - pillH / 2;
    ctx.fillStyle = isDarkWin ? '#18181B' : '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(pX, pY, pillW, pillH, 4);
    ctx.fill();
    ctx.font = `600 ${Math.round(barHeight * 0.36)}px 'Inter', sans-serif`;
    ctx.fillStyle = isDarkWin ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(slide.linkPillText || slide.heroTitle.slice(0, 24), W / 2, dotY);
    ctx.restore();

    // Screenshot body
    const bodyX = winX + 8;
    const bodyY = winY + barHeight + 6;
    const bodyW = winWidth - 16;
    const bodyH = winHeight - barHeight - 14;

    if (slide.screenshotImgEl && slide.screenshotImgEl.complete) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bodyX, bodyY, bodyW, bodyH, 8);
      ctx.clip();
      ctx.drawImage(slide.screenshotImgEl, bodyX, bodyY, bodyW, bodyH);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = isDarkWin ? '#09090B' : '#FAFAFA';
      ctx.beginPath();
      ctx.roundRect(bodyX, bodyY, bodyW, bodyH, 8);
      ctx.fill();
      ctx.font = `700 ${Math.round(bodyW * 0.04)}px 'Inter', sans-serif`;
      ctx.fillStyle = isDarkWin ? '#52525B' : '#A1A1AA';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📸 Drag & Drop App Screenshot Here', W / 2, bodyY + bodyH / 2);
      ctx.restore();
    }
  } else if (slide.assetFrameType === 'mobile-phone') {
    // --- MOBILE PHONE MOCKUP (iPhone Frame) ---
    let headerY = H * 0.12;

    if (options.showHeroTitle && slide.heroTitle) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `${options.isBold ? '900' : '700'} ${Math.round(options.heroFontSize * 0.8)}px '${options.fontFamily}', sans-serif`;
      ctx.fillStyle = options.textColor;
      drawHighlightedText(ctx, slide.heroTitle, slide.highlightWords, W / 2, headerY, options.accentColor, options.textColor, W * 0.86);
      headerY += Math.round(options.heroFontSize * 1.05);
      ctx.restore();
    }

    if (options.showSubtitle && slide.subtitleText) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `600 ${Math.round(W * 0.03)}px '${options.fontFamily}', sans-serif`;
      ctx.fillStyle = options.textColor;
      ctx.globalAlpha = 0.85;
      ctx.fillText(slide.subtitleText, W / 2, headerY);
      headerY += Math.round(W * 0.045);
      ctx.restore();
    }

    const phoneW = W * 0.52;
    const phoneH = H * 0.58;
    const phoneX = (W - phoneW) / 2;
    const phoneY = headerY + 10;

    // Phone Outer Frame
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = '#09090B';
    ctx.beginPath();
    ctx.roundRect(phoneX, phoneY, phoneW, phoneH, 32);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Phone Screen Area
    const screenX = phoneX + 8;
    const screenY = phoneY + 8;
    const screenW = phoneW - 16;
    const screenH = phoneH - 16;

    if (slide.screenshotImgEl && slide.screenshotImgEl.complete) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(screenX, screenY, screenW, screenH, 26);
      ctx.clip();
      ctx.drawImage(slide.screenshotImgEl, screenX, screenY, screenW, screenH);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = '#18181B';
      ctx.beginPath();
      ctx.roundRect(screenX, screenY, screenW, screenH, 26);
      ctx.fill();
      ctx.font = `700 ${Math.round(screenW * 0.06)}px 'Inter', sans-serif`;
      ctx.fillStyle = '#71717A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📱 Mobile UI', W / 2, screenY + screenH / 2);
      ctx.restore();
    }

    // Dynamic Island / Camera Notch
    ctx.save();
    const notchW = phoneW * 0.28;
    const notchH = 14;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect((phoneW - notchW) / 2 + phoneX, phoneY + 14, notchW, notchH, 7);
    ctx.fill();
    ctx.restore();
  } else if (slide.assetFrameType === 'split-comparison') {
    // --- SPLIT BEFORE / AFTER COMPARISON CARD (Images 10 & 11) ---
    let headerY = H * 0.12;

    if (options.showHeroTitle && slide.heroTitle) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `${options.isBold ? '900' : '700'} ${Math.round(options.heroFontSize * 0.8)}px '${options.fontFamily}', sans-serif`;
      ctx.fillStyle = options.textColor;
      drawHighlightedText(ctx, slide.heroTitle, slide.highlightWords, W / 2, headerY, options.accentColor, options.textColor, W * 0.88);
      headerY += Math.round(options.heroFontSize * 1.1);
      ctx.restore();
    }

    const cardW = W * 0.86;
    const cardH = H * 0.44;
    const cardX = (W - cardW) / 2;
    const cardY = headerY + 12;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#09090B';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const halfW = (cardW - 4) / 2;

    // Left (Before)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX + 2, cardY + 2, halfW, cardH - 4, [14, 0, 0, 14]);
    ctx.clip();
    if (slide.screenshotImgEl && slide.screenshotImgEl.complete) {
      ctx.drawImage(slide.screenshotImgEl, cardX + 2, cardY + 2, halfW, cardH - 4);
    } else {
      ctx.fillStyle = '#18181B';
      ctx.fillRect(cardX + 2, cardY + 2, halfW, cardH - 4);
    }
    ctx.restore();

    // Right (After)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX + halfW + 2, cardY + 2, halfW, cardH - 4, [0, 14, 14, 0]);
    ctx.clip();
    if (slide.secondaryScreenshotImgEl && slide.secondaryScreenshotImgEl.complete) {
      ctx.drawImage(slide.secondaryScreenshotImgEl, cardX + halfW + 2, cardY + 2, halfW, cardH - 4);
    } else {
      ctx.fillStyle = '#27272A';
      ctx.fillRect(cardX + halfW + 2, cardY + 2, halfW, cardH - 4);
    }
    ctx.restore();

    // Center Split Line
    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cardX + halfW + 2, cardY);
    ctx.lineTo(cardX + halfW + 2, cardY + cardH);
    ctx.stroke();
    ctx.restore();

    // Labels
    drawPillBadge(ctx, slide.beforeLabel || 'BEFORE', cardX + 16, cardY + 16, '#000000', '#FFFFFF');
    drawPillBadge(ctx, slide.afterLabel || 'AFTER', cardX + halfW + 16, cardY + 16, options.accentColor, '#000000');

    // Bottom breakdown box if subtitle present
    if (options.showSubtitle && slide.subtitleText) {
      const descY = cardY + cardH + 18;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `600 ${Math.round(W * 0.03)}px '${options.fontFamily}', sans-serif`;
      ctx.fillStyle = options.textColor;
      ctx.globalAlpha = 0.9;
      ctx.fillText(slide.subtitleText, W / 2, descY);
      ctx.restore();
    }
  } else if (slide.assetFrameType === 'color-swatches') {
    // --- 5 COLOR PALETTE CARDS (Color Psychology Image 6 Style) ---
    let headerY = H * 0.14;

    if (options.showHeroTitle && slide.heroTitle) {
      ctx.save();
      ctx.textAlign = options.textAlign;
      const textX = options.textAlign === 'center' ? W / 2 : padX;
      ctx.font = `${options.isBold ? '900' : '700'} ${options.heroFontSize}px '${options.fontFamily}', serif`;
      ctx.fillStyle = options.textColor;
      drawHighlightedText(ctx, slide.heroTitle, slide.highlightWords, textX, headerY, options.accentColor, options.textColor, W * 0.85);
      headerY += Math.round(options.heroFontSize * 1.2);
      ctx.restore();
    }

    const swatches = slide.colorSwatches || [
      { name: 'Emerald', hex: '#10B981', desc: 'Calming' },
      { name: 'Sapphire', hex: '#3B82F6', desc: 'Trust' },
      { name: 'Ruby', hex: '#EF4444', desc: 'Urgency' },
      { name: 'Amber', hex: '#F59E0B', desc: 'Warmth' },
      { name: 'Violet', hex: '#8B5CF6', desc: 'Luxury' },
    ];

    const totalSwatches = swatches.length;
    const cardGap = 12;
    const totalGap = cardGap * (totalSwatches - 1);
    const cardW = (W * 0.85 - totalGap) / totalSwatches;
    const cardH = H * 0.38;
    const startX = (W - W * 0.85) / 2;
    const startY = headerY + 16;

    swatches.forEach((swatch, idx) => {
      const cX = startX + idx * (cardW + cardGap);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = swatch.hex;
      ctx.beginPath();
      ctx.roundRect(cX, startY, cardW, cardH * 0.65, [12, 12, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(cX, startY + cardH * 0.65, cardW, cardH * 0.35, [0, 0, 12, 12]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = `800 ${Math.round(cardW * 0.16)}px 'Inter', sans-serif`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText(swatch.name, cX + cardW / 2, startY + cardH * 0.76);

      ctx.font = `600 ${Math.round(cardW * 0.13)}px monospace`;
      ctx.fillStyle = '#666666';
      ctx.fillText(swatch.hex.toUpperCase(), cX + cardW / 2, startY + cardH * 0.89);
      ctx.restore();
    });
  } else {
    // --- PURE TYPOGRAPHY & QUOTE CARD MODE ---
    let centerY =
      options.textVerticalPos === 'center'
        ? H * 0.48
        : options.textVerticalPos === 'top'
        ? H * 0.34
        : H * 0.64;
    const textX =
      options.textAlign === 'center'
        ? W / 2
        : options.textAlign === 'left'
        ? padX
        : W - padX;

    ctx.save();
    ctx.textAlign = options.textAlign;

    // Eyebrow
    if (options.showEyebrow && slide.eyebrowText) {
      ctx.font = `700 ${Math.round(options.heroFontSize * 0.5)}px '${options.eyebrowFontFamily}', cursive, sans-serif`;
      ctx.fillStyle = options.accentColor;
      ctx.fillText(slide.eyebrowText, textX, centerY - options.heroFontSize * 1.15);
    }

    // Hero Title / Quote Body
    if (options.showHeroTitle && slide.heroTitle) {
      ctx.font = `${options.isBold ? '900' : '700'} ${options.isItalic ? 'italic ' : ''}${options.heroFontSize}px '${options.fontFamily}', sans-serif`;
      ctx.fillStyle = options.textColor;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;

      const lines = wrapText(ctx, slide.heroTitle, W * 0.84);
      const lineHeight = options.heroFontSize * 1.25;
      const totalTextHeight = lines.length * lineHeight;
      const startY = centerY - totalTextHeight / 2;

      lines.forEach((l, i) => {
        drawHighlightedText(ctx, l, slide.highlightWords, textX, startY + i * lineHeight, options.accentColor, options.textColor, W * 0.84);
      });

      centerY = startY + totalTextHeight + 20;
    }

    // Subtitle / Note
    if (options.showSubtitle && slide.subtitleText) {
      ctx.font = `600 ${Math.round(options.heroFontSize * 0.42)}px '${options.fontFamily}', sans-serif`;
      ctx.fillStyle = options.textColor;
      ctx.globalAlpha = 0.85;
      ctx.fillText(slide.subtitleText, textX, centerY + 14);
    }

    ctx.restore();
  }

  // 8. DIRECT LINK / CALLOUT PILL (BOTTOM)
  if (options.showLinkPill && slide.linkPillText) {
    const btmY = H * 0.91;
    ctx.save();

    if (slide.linkPillType === 'comment-dm') {
      // Engagement Prompt Style (Image 4 & 12)
      const promptStr = `💬 Comment "${slide.linkPillText}" for DM Link`;
      ctx.font = `900 ${Math.round(W * 0.03)}px 'Space Grotesk', sans-serif`;
      const pW = ctx.measureText(promptStr).width + 36;
      const pH = Math.round(W * 0.076);
      const pX = (W - pW) / 2;

      ctx.fillStyle = options.accentColor;
      ctx.beginPath();
      ctx.roundRect(pX, btmY - pH / 2, pW, pH, 8);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(promptStr, W / 2, btmY);
    } else {
      // Standard Direct Link Pill (Image 2 & 3)
      const linkStr = `🔗 ${slide.linkPillText}`;
      ctx.font = `800 ${Math.round(W * 0.031)}px 'Inter', sans-serif`;
      const lWidth = ctx.measureText(linkStr).width + 36;
      const lHeight = Math.round(W * 0.072);
      const lX = (W - lWidth) / 2;
      const lY = btmY - lHeight / 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.beginPath();
      ctx.roundRect(lX, lY, lWidth, lHeight, lHeight / 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(linkStr, W / 2, btmY);

      ctx.font = `700 ${Math.round(W * 0.028)}px 'Caveat', cursive, sans-serif`;
      ctx.fillStyle = options.accentColor;
      ctx.textAlign = 'right';
      ctx.fillText('Direct link ⤹', lX - 12, btmY);
    }
    ctx.restore();
  }

  // 9. AUTHOR / PROFILE ATTRIBUTION BLOCK
  if (options.showAuthorBlock && slide.authorName) {
    const authY = H * 0.84;
    const authX = options.textAlign === 'center' ? W / 2 : padX;

    ctx.save();
    ctx.textAlign = options.textAlign === 'center' ? 'center' : 'left';

    // Avatar icon / photo circle
    const avatarR = Math.round(W * 0.035);
    const avX = options.textAlign === 'center' ? W / 2 - avatarR : padX;
    const avY = authY - avatarR * 1.6;

    if (slide.avatarImgEl && slide.avatarImgEl.complete) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(avX + avatarR, avY + avatarR, avatarR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(slide.avatarImgEl, avX, avY, avatarR * 2, avatarR * 2);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = options.accentColor;
      ctx.beginPath();
      ctx.arc(avX + avatarR, avY + avatarR, avatarR, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `900 ${Math.round(avatarR * 0.9)}px 'Inter', sans-serif`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(slide.authorName.charAt(0).toUpperCase(), avX + avatarR, avY + avatarR);
      ctx.restore();
    }

    // Author Name + Verified Badge
    ctx.font = `800 ${Math.round(W * 0.032)}px 'Inter', sans-serif`;
    ctx.fillStyle = options.textColor;
    ctx.fillText(slide.authorName, authX, authY);

    if (slide.authorVerified) {
      const nameW = ctx.measureText(slide.authorName).width;
      const badgeX = options.textAlign === 'center' ? authX + nameW / 2 + 10 : authX + nameW + 10;
      drawVerifiedBadge(ctx, badgeX, authY - 5, Math.round(W * 0.016));
    }

    if (slide.authorHandle) {
      ctx.font = `500 ${Math.round(W * 0.026)}px 'Inter', sans-serif`;
      ctx.fillStyle = options.textColor;
      ctx.globalAlpha = 0.7;
      ctx.fillText(slide.authorHandle, authX, authY + 24);
    }
    ctx.restore();
  }

  // 10. SWIPE PROMPT
  if (slide.swipePrompt) {
    ctx.save();
    ctx.font = `700 ${Math.round(W * 0.03)}px 'Inter', sans-serif`;
    ctx.fillStyle = options.textColor;
    ctx.globalAlpha = 0.8;
    ctx.textAlign = 'center';
    ctx.fillText(slide.swipePrompt, W / 2, H * 0.94);
    ctx.restore();
  }

  // 11. SAFE ZONE GUIDES
  if (options.drawGuides) {
    ctx.save();
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    const feedH = W * (5 / 4);
    const feedTop = (H - feedH) / 2;
    ctx.strokeRect(0, feedTop, W, feedH);
    ctx.font = '900 20px monospace';
    ctx.fillStyle = '#EF4444';
    ctx.fillText('INSTAGRAM FEED 4:5 SAFE CROP', 24, feedTop + 32);
    ctx.restore();
  }
}

// Helpers
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  let line = '';
  const lines: string[] = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  return lines;
}

function drawHighlightedText(
  ctx: CanvasRenderingContext2D,
  lineText: string,
  highlightWords: string,
  startX: number,
  y: number,
  accentColor: string,
  textColor: string,
  maxWidth: number
) {
  if (!highlightWords || !highlightWords.trim()) {
    ctx.fillStyle = textColor;
    ctx.fillText(lineText, startX, y);
    return;
  }

  const highlightList = highlightWords
    .toLowerCase()
    .split(',')
    .map((w) => w.trim())
    .filter(Boolean);

  const words = lineText.split(' ');
  const totalWidth = ctx.measureText(lineText).width;
  let currentX =
    ctx.textAlign === 'center'
      ? startX - totalWidth / 2
      : ctx.textAlign === 'right'
      ? startX - totalWidth
      : startX;

  const originalAlign = ctx.textAlign;
  ctx.textAlign = 'left';

  words.forEach((word) => {
    const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isHighlighted = highlightList.some((h) => cleanWord === h || cleanWord.includes(h));

    ctx.fillStyle = isHighlighted ? accentColor : textColor;
    ctx.fillText(word + ' ', currentX, y);
    currentX += ctx.measureText(word + ' ').width;
  });

  ctx.textAlign = originalAlign;
}

function drawPillBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bgColor: string,
  textColor: string
) {
  ctx.save();
  ctx.font = '900 14px monospace';
  const tw = ctx.measureText(text).width + 20;
  const th = 26;
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(x, y, tw, th, 4);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + tw / 2, y + th / 2);
  ctx.restore();
}

function drawVerifiedBadge(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.save();
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - radius * 0.4, y);
  ctx.lineTo(x - radius * 0.1, y + radius * 0.35);
  ctx.lineTo(x + radius * 0.45, y - radius * 0.3);
  ctx.stroke();
  ctx.restore();
}
