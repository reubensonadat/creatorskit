// Text Match Cut Engine — Precision Optical Anchor Tracking & Vintage Newspaper Graphics
// Matches authentic documentary / newspaper match-cut animations where the camera locks onto the highlighted anchor phrase
// while moving between different sections, mastheads, and pages of the newspaper with all sentence text at identical font size.

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

export interface RenderOptions {
  anchorPhrase: string;
  highlightColor: string;
  highlightStyle: 'marker' | 'underline' | 'box' | 'circle' | 'tape' | 'double-underline';
  markerOpacity: number;
  paperTheme: 'vintage' | 'salmon' | 'tabloid' | 'dossier' | 'crisp' | 'noir';
  depthOfField: boolean;
  dofIntensity: number; // 0 to 1
  filmGrain: boolean;
  cameraShake: boolean;
  aspectRatio: '9:16' | '1:1' | '16:9' | '4:5' | '4:3' | '3:4';
  showCrosshairGuide?: boolean;
  animationMode?: 'match-cut' | 'animated-highlight';
  highlightProgress?: number; // 0.0 to 1.0
  highlightDirection?: 'ltr' | 'rtl'; // Left-to-Right or Right-to-Left
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

export const AVAILABLE_FONTS = [
  { id: 'serif', label: 'Vintage Serif', value: '"Playfair Display", Georgia, serif' },
  { id: 'typewriter', label: 'Courier Typewriter', value: '"Courier New", Courier, monospace' },
  { id: 'tabloid', label: 'Bold Tabloid Gothic', value: 'Impact, "Arial Black", sans-serif' },
  { id: 'editorial', label: 'Classic Times', value: '"Times New Roman", Times, serif' },
  { id: 'brutalist', label: 'Brutalist Sans', value: '"Helvetica Neue", Arial, sans-serif' },
  { id: 'georgia', label: 'Antique Book', value: 'Georgia, serif' },
];

export const PAPER_THEMES = {
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
};

// Procedural paper grain pattern cache
let noisePatternCanvas: HTMLCanvasElement | null = null;
function getNoisePattern(): HTMLCanvasElement {
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
function safeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radii: number | number[]
) {
  if (typeof (ctx as any).roundRect === 'function') {
    try {
      (ctx as any).roundRect(x, y, w, h, radii);
      return;
    } catch { }
  }
  ctx.rect(x, y, w, h);
}

// Low-latency Web Audio Synthesizer
let audioCtx: AudioContext | null = null;

export function synthesizeCutSound(
  ctx: AudioContext,
  dest: AudioNode,
  soundType: 'shutter' | 'typewriter' | 'motor' | 'paper' | 'mute' = 'shutter',
  volume = 0.35,
  scheduledTime?: number
) {
  if (soundType === 'mute') return;
  const t = scheduledTime !== undefined ? scheduledTime : ctx.currentTime;

  try {
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.min(1.0, Math.max(0, volume)), t);
    masterGain.connect(dest);

    if (soundType === 'shutter') {
      const bufferSize = Math.floor(ctx.sampleRate * 0.035);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(3200, t);
      noise.connect(filter);
      filter.connect(masterGain);
      noise.start(t);
      noise.stop(t + 0.04);
    } else if (soundType === 'typewriter') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(950, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.03);
      gain.gain.setValueAtTime(0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.04);
    } else if (soundType === 'motor') {
      const bufferSize = Math.floor(ctx.sampleRate * 0.045);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1900, t);
      noise.connect(filter);
      filter.connect(masterGain);
      noise.start(t);
      noise.stop(t + 0.05);
    } else if (soundType === 'paper') {
      const bufferSize = Math.floor(ctx.sampleRate * 0.04);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2400, t);
      noise.connect(filter);
      filter.connect(masterGain);
      noise.start(t);
      noise.stop(t + 0.04);
    }
  } catch (err) {
    console.warn('Synthesize cut sound error:', err);
  }
}

export function playCutSound(
  soundType: 'shutter' | 'typewriter' | 'motor' | 'paper' | 'mute' = 'shutter',
  volume = 0.35
) {
  if (soundType === 'mute' || typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'suspended') {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    synthesizeCutSound(audioCtx, audioCtx.destination, soundType, volume);
  } catch (err) {
    console.warn('Cut SFX playback error:', err);
  }
}

// Background dense newspaper copy corpus
const BACKGROUND_BODY_PARAGRAPHS = [
  `The spokesperson smiled and said nothing that could be quoted. Nobody was charged but several people were deeply embarrassed. The meeting was rescheduled four times and then cancelled. The corporation released a statement. Nobody read it. He returned the money. Most of it. Eventually. Local residents were surprised but not shocked. Mostly not shocked. The report is nineteen pages and solves nothing. The building has been there for years. Nobody noticed until now. Insiders say the culture was "a lot," which means something specific. She blamed her assistant. The assistant has since resigned.`,
  `The app was updated. It is worse now. The investigation is ongoing, apparently. An expert was consulted. The expert was also confused. The chairman called it unprecedented. What happened was unprecedented. Mostly not shocked. He said it twice. Nobody wrote it down. The consultant fee was not disclosed. It was large. The app was updated. It is worse now. Nobody resigned, which surprised everyone, including the board. Her publicist says she is resting and reflecting on the experience. The report is nineteen pages and solves nothing. Witnesses disagree on basically everything. A pigeon was briefly detained. It offered no statement. Nobody wrote it down. An audit was mentioned briefly and then not mentioned again. It turns out the license had expired in 2019. The email was sent to everyone, including the people it was about.`,
  `Officers are reviewing it slowly. Funding has been allocated. Its current location is unknown. The investigation is ongoing, apparently. Nobody was charged but several people were deeply embarrassed. The email was sent to everyone, including the board. It turns out the license had expired in 2019. An expert was consulted. The expert was also confused. Her publicist says she is resting and reflecting on the experience. All parties described it as a misunderstanding. A second van was also seen. Nobody mentioned this until now. She won the appeal. The other nine cases were dismissed. A local man claims responsibility. Police are not convinced. The contractor billed for work that is not visible to anyone. The mayor denied everything and then left the building. Three people clapped. Several others checked their phones.`,
  `The suspect was later found at a nearby buffet. Police arrived three hours later. They had sandwiches. The corporation released a statement. A full refund was promised to some of the affected customers. City council voted 4-3 to table the matter indefinitely. He resigned "to spend more time with his spreadsheets." All parties described it as a misunderstanding. Funding has been allocated. Its current location is unknown. He was asked to return the trophy. He kept the trophy. The meeting was rescheduled four times and then cancelled. Nobody noticed until now. Insiders say the culture was "a lot," which means something specific. Someone say it was worse but like a new way everyday. The assistant has since resigned. Experts called the situation "not ideal" and left.`,
];

/**
 * Offscreen rendering buffers for optical depth of field tilt-shift
 */
let offscreenMain: HTMLCanvasElement | null = null;
let offscreenBlur: HTMLCanvasElement | null = null;
let offscreenMask: HTMLCanvasElement | null = null;

function getBufferCanvas(w: number, h: number, type: 'main' | 'blur' | 'mask'): HTMLCanvasElement {
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
 * Main Camera-Tracking Newspaper Match-Cut Renderer
 */
export function renderNewspaperMatchCut(
  targetCanvasCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cut: NewspaperCut,
  options: RenderOptions,
  frameIndex = 0
) {
  const theme = PAPER_THEMES[options.paperTheme] || PAPER_THEMES.vintage;
  const isDark = options.paperTheme === 'noir';

  // Use offscreen canvas buffer if depth of field is active (paper env only)
  const useDof = Boolean(options.depthOfField && typeof document !== 'undefined');
  const renderBuffer = useDof ? getBufferCanvas(width, height, 'main') : null;
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
  // Page width is generous and edge-to-edge
  const pageWidth = Math.min(width * 0.92, 1040);
  const pageLeftX = (width - pageWidth) / 2;

  // Resolve Font Family
  const DEFAULT_CYCLE = [
    '"Playfair Display", Georgia, serif',
    '"Courier New", Courier, monospace',
    'Impact, "Arial Black", sans-serif',
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

  // Headline Typography (where anchor word lives)
  const headlineFontSize = Math.max(26, Math.round(width * 0.038)) * (options.headlineScale ?? 1);
  const headlineLineHeight = headlineFontSize * 1.35;
  const headlineFont = `bold ${headlineFontSize}px ${chosenFont}`;

  // Body Copy Typography (for background columns)
  const bodyFontSize = Math.max(12, Math.round(width * 0.0165));
  const bodyLineHeight = bodyFontSize * 1.52;
  const bodyFont = `${bodyFontSize}px Georgia, "Times New Roman", serif`;

  // Parse Headline into Prefix, Match, and Suffix
  const anchor = (options.anchorPhrase || '').trim();
  const headlineRaw = (cut.headline || '').trim();

  let prefix = '';
  let matchText = anchor;
  let suffix = '';

  const cleanAnchor = anchor.toLowerCase();
  const cleanHeadline = headlineRaw.toLowerCase();
  const anchorIndex = cleanAnchor.length > 0 ? cleanHeadline.indexOf(cleanAnchor) : -1;

  if (anchorIndex !== -1 && cleanAnchor.length > 0) {
    prefix = headlineRaw.slice(0, anchorIndex);
    matchText = headlineRaw.slice(anchorIndex, anchorIndex + anchor.length);
    suffix = headlineRaw.slice(anchorIndex + anchor.length);
  } else {
    prefix = 'Leaked report mentions ';
    matchText = anchor || 'Rare earth minerals';
    suffix = ' seventeen times in audit';
  }

  // Measure Headline Elements
  ctx.font = headlineFont;
  const prefixW = ctx.measureText(prefix).width;
  const matchW = ctx.measureText(matchText).width;
  const suffixW = ctx.measureText(suffix).width;
  const fullHeadlineW = prefixW + matchW + suffixW;

  // Calculate Anchor Center in Document Space
  const anchorCenterFromHeadlineStart = prefixW + matchW / 2;
  const docHeadlineX = pageLeftX + (pageWidth - fullHeadlineW) / 2;
  const docHeadlineY = 520; // fixed Y line in document space

  let docAnchorCenterX = docHeadlineX + anchorCenterFromHeadlineStart;
  let docAnchorCenterY = docHeadlineY;

  const sector = options.highlightSector || 'center-headline';
  if (sector === 'top-masthead') {
    docAnchorCenterX = pageLeftX + pageWidth / 2;
    docAnchorCenterY = docHeadlineY - 75;
  } else if (sector === 'body-paragraph') {
    docAnchorCenterX = pageLeftX + pageWidth * 0.28;
    docAnchorCenterY = docHeadlineY + 140;
  }

  // ============================================================
  // CAMERA TRACKING TRANSFORM
  // Translates the entire document stage so that (docAnchorCenterX, docAnchorCenterY)
  // is placed DEAD-CENTER on screen at (targetCenterX, targetCenterY)!
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
  // SECTION A: Dense Top Columns (Stage text above the headline)
  // ------------------------------------------------------------
  if (options.showTopColumns !== false) {
    const topColumnsY = 40;
    const topColumnsBottomY = docHeadlineY - 140;
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

  // ------------------------------------------------------------
  // SECTION B: Masthead & Dateline
  // ------------------------------------------------------------
  if (options.showMasthead !== false) {
    const mastheadY = docHeadlineY - 75;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.ink;
    ctx.font = `900 ${Math.max(16, Math.round(width * 0.022))}px "Playfair Display", Georgia, serif`;
    ctx.fillText(cut.masthead.toUpperCase(), pageLeftX + pageWidth / 2, mastheadY);

    if (cut.dateString) {
      ctx.font = `bold ${Math.max(9, Math.round(width * 0.012))}px "Courier New", monospace`;
      ctx.fillStyle = theme.inkMuted;
      ctx.fillText(cut.dateString.toUpperCase(), pageLeftX + pageWidth / 2, mastheadY + 18);
    }

    // Thin double divider rules above headline
    if (options.showDividerRules !== false) {
      ctx.strokeStyle = theme.ruleColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(pageLeftX, mastheadY + 30);
      ctx.lineTo(pageLeftX + pageWidth, mastheadY + 30);
      ctx.stroke();

      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(pageLeftX, mastheadY + 34);
      ctx.lineTo(pageLeftX + pageWidth, mastheadY + 34);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ------------------------------------------------------------
  // SECTION C: The Headline & Highlighted Anchor Sentence
  // (100% IDENTICAL FONT SIZE AND BASELINE ACROSS ALL WORDS)
  // ------------------------------------------------------------
  ctx.save();
  ctx.font = headlineFont;
  ctx.textBaseline = 'middle';

  const anchorDrawX = docHeadlineX + prefixW;

  // Draw Highlight behind/around the anchor word
  drawAnchorHighlight(ctx, anchorDrawX, docHeadlineY, matchW, headlineFontSize, options);

  // 1. Draw Prefix Words (Exact same font size)
  ctx.fillStyle = theme.ink;
  ctx.textAlign = 'left';
  if (prefix) {
    ctx.fillText(prefix, docHeadlineX, docHeadlineY);
  }

  // 2. Draw Anchor Words (Exact same font size)
  if (options.highlightStyle === 'box') {
    ctx.fillStyle = '#ffffff'; // Knockout on solid box
  } else {
    ctx.fillStyle = isDark ? '#ffffff' : theme.ink;
  }
  ctx.fillText(matchText, anchorDrawX, docHeadlineY);

  // 3. Draw Suffix Words (Exact same font size)
  ctx.fillStyle = theme.ink;
  if (suffix) {
    ctx.fillText(suffix, anchorDrawX + matchW, docHeadlineY);
  }

  // Thin rule below headline
  if (options.showDividerRules !== false) {
    ctx.strokeStyle = theme.ruleColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pageLeftX, docHeadlineY + headlineFontSize * 0.85);
    ctx.lineTo(pageLeftX + pageWidth, docHeadlineY + headlineFontSize * 0.85);
    ctx.stroke();
  }
  ctx.restore();

  // ------------------------------------------------------------
  // SECTION D: Subhead & Byline
  // ------------------------------------------------------------
  let afterHeadlineY = docHeadlineY + headlineFontSize + 20;

  if (options.showSubhead !== false && cut.subhead) {
    ctx.save();
    ctx.font = `italic ${Math.max(13, Math.round(width * 0.017))}px Georgia, serif`;
    ctx.fillStyle = theme.inkMuted;
    ctx.textAlign = 'left';
    ctx.fillText(cut.subhead, pageLeftX, afterHeadlineY);
    afterHeadlineY += 22;
    ctx.restore();
  }

  if (options.showByline !== false && (cut.byline || cut.location)) {
    ctx.save();
    ctx.font = `bold italic ${Math.max(12, Math.round(width * 0.0155))}px Georgia, serif`;
    ctx.fillStyle = theme.inkMuted;
    ctx.textAlign = 'left';
    const bylineStr = [cut.location, cut.byline].filter(Boolean).join(' — ') || 'From Our Special Correspondent';
    ctx.fillText(bylineStr, pageLeftX, afterHeadlineY);
    afterHeadlineY += 24;
    ctx.restore();
  }

  // ------------------------------------------------------------
  // SECTION E: Dense Bottom Columns (Stage text below the headline)
  // ------------------------------------------------------------
  if (options.showBottomColumns !== false) {
    const bottomColumnsH = 1600;
    drawDenseColumns(
      ctx,
      pageLeftX,
      afterHeadlineY + 8,
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

  ctx.restore(); // Restore camera tracking transform

  // ------------------------------------------------------------
  // SECTION F: Depth of Field Tilt-Shift Blur (Wide clear focal center)
  // ------------------------------------------------------------
  if (useDof && renderBuffer) {
    const blurCanvas = getBufferCanvas(width, height, 'blur');
    const blurCtx = blurCanvas.getContext('2d')!;
    blurCtx.clearRect(0, 0, width, height);

    const blurRadius = Math.max(3, Math.round(options.dofIntensity * 14));
    try {
      blurCtx.filter = `blur(${blurRadius}px)`;
    } catch { }
    blurCtx.drawImage(renderBuffer, 0, 0);
    try {
      blurCtx.filter = 'none';
    } catch { }

    // Blit blurred buffer to target canvas
    targetCanvasCtx.clearRect(0, 0, width, height);
    targetCanvasCtx.drawImage(blurCanvas, 0, 0);

    // Create clear center circular focal mask (Optical Circular Lens Blur)
    const mask = getBufferCanvas(width, height, 'mask');
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

    // Blit crisp circular center band over blurred stage
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

/**
 * Draws dense multi-column newspaper paragraphs with guaranteed full coverage
 */
function drawDenseColumns(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  totalWidth: number,
  maxHeight: number,
  paragraphs: string[],
  font: string,
  fontSize: number,
  lineHeight: number,
  theme: typeof PAPER_THEMES['vintage'],
  numColumns = 3
) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = theme.ink;
  ctx.textBaseline = 'top';

  const numCols = numColumns;
  const gutter = 22;
  const colWidth = (totalWidth - gutter * (numCols - 1)) / numCols;

  // Flatten and expand text pool to ensure columns never run out of copy
  const expandedText = [...paragraphs, ...BACKGROUND_BODY_PARAGRAPHS, ...paragraphs];
  const allWords = expandedText.join(' ').split(/\s+/).filter(Boolean);

  let colIdx = 0;
  let curY = y;
  let wordIdx = 0;

  while (colIdx < numCols && wordIdx < allWords.length) {
    let currentLine = '';

    while (wordIdx < allWords.length) {
      const nextWord = allWords[wordIdx];
      const testLine = currentLine ? `${currentLine} ${nextWord}` : nextWord;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > colWidth && currentLine) {
        // Draw line in current column
        const colX = x + colIdx * (colWidth + gutter);
        ctx.fillText(currentLine, colX, curY);
        curY += lineHeight;
        currentLine = '';

        // If column bottom reached, step to next column
        if (curY + lineHeight > y + maxHeight) {
          colIdx++;
          curY = y;
          break;
        }
      } else {
        currentLine = testLine;
        wordIdx++;
      }
    }

    // Flush trailing line if any
    if (currentLine && colIdx < numCols && curY + lineHeight <= y + maxHeight) {
      const colX = x + colIdx * (colWidth + gutter);
      ctx.fillText(currentLine, colX, curY);
      curY += lineHeight;
    }

    // Loop words if needed to guarantee 100% dense column filling
    if (colIdx < numCols && wordIdx >= allWords.length) {
      wordIdx = 0;
    }
  }

  // Draw thin vertical column divider rules
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

/**
 * Draws the vivid marker highlighter, underline, box, or tape with optional animated progressive sweep
 */
function drawAnchorHighlight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  textWidth: number,
  fontSize: number,
  options: RenderOptions
) {
  const isAnimated = options.animationMode === 'animated-highlight';
  const progress = isAnimated ? Math.min(1, Math.max(0, options.highlightProgress ?? 1)) : 1;

  if (progress <= 0) return; // Not started yet

  ctx.save();
  const padX = fontSize * 0.16;
  const padY = fontSize * 0.12;
  const hx = x - padX;
  const hy = y - fontSize * 0.52 - padY;
  const hw = textWidth + padX * 2;
  const hh = fontSize * 1.04 + padY * 2;

  const isRtl = options.highlightDirection === 'rtl';
  const drawnW = hw * progress;
  const currentDrawX = isRtl ? hx + hw - drawnW : hx;

  if (options.highlightStyle === 'marker') {
    // Fluorescent Chisel Highlighter
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
    ctx.rect(currentDrawX - (isRtl ? 0 : 8), hy, drawnW + 16, hh);
    ctx.fill();
  }
  ctx.restore();
}
