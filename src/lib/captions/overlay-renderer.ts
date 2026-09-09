/**
 * Video Overlay Renderer for CreatorKit Auto Captions
 * ====================================================
 * Renders animated, timestamped kinetic captions directly onto an HTML5 Canvas
 * and exports as a transparent video (WebM VP9 with Alpha Channel) or Chroma Key (Green Screen)
 * for direct overlay onto video timelines in Premiere Pro, DaVinci Resolve, Final Cut, and CapCut.
 * 
 * Customization System:
 * - Font Family: Bebas Neue (Tabloid), Montserrat (Modern), Inter (Brutalist), Archivo Black, Space Mono
 * - Font Size: Scalable typography slider with high-DPI rendering
 * - Letter Spacing & Line Height controls
 * - Vertical Position: Drag/slide from bottom (82%) to middle (50%) or top (20%)
 * - Highlighter Color: Yellow (#FFE500), Neon Green, Cyan, Pink, Orange, White, Custom Hex
 * - 3 Caption Modes:
 *     1. 'teleprompter' : Full line in view, active word highlighted with pill marker in real time
 *     2. 'kinetic-pop'   : High-energy creator pop with scale bounce & heavy stroke outline
 *     3. 'minimal'       : Clean, small TV/film lower-third subtitle bar
 * 
 * Special Rules:
 * - Bracket stage cues like [HOOK], [SILENCE], [PAUSE 3s] are strictly filtered out
 * - During silence / dead-air, NOTHING is rendered (100% transparent canvas)
 * - Zero excessive emojis. Clean brutalist design matching CreatorKit Studio.
 */

import { SubtitleCue, cleanStageDirections } from './vtt-formatter';

export type CaptionVideoMode = 'teleprompter' | 'kinetic-pop' | 'minimal';
export type CaptionStylePreset = CaptionVideoMode | 'tiktok' | 'hormozi'; // Backward compatibility
export type VideoAspectRatio = '9:16' | '16:9';
export type VideoBackgroundMode = 'transparent' | 'green-screen' | 'magenta-screen';

export type CaptionPillBackground = 'clear' | 'dark' | 'light' | 'custom';

export interface OverlayTypographyOptions {
    fontFamily?: string;       // e.g. "Montserrat", "Bebas Neue", "Inter"
    fontSize?: number;         // in px (scaled proportionally to resolution)
    letterSpacing?: number;    // in px (-2 to 8)
    lineHeight?: number;       // multiplier (e.g. 1.25)
    yPositionPercent?: number; // 0 to 100 (e.g. 78 for 78% from top)
    pillBackground?: CaptionPillBackground; // 'clear' | 'dark' | 'light' | 'custom'
    pillCustomColor?: string;  // user defined background color
    emojiMode?: boolean;       // Append relevant emojis
    springPhysics?: boolean;   // Physics-based elastic overshoot bounce
    bounceIntensity?: number;  // 0.5 to 2.0 (default 1.1)
    wordRotation?: boolean;    // Subtle dynamic tilt for punchy energetic pop
    wordPop?: boolean;         // Karaoke spring-pop on the active spoken word (teleprompter mode)
    textShadow?: boolean;      // Drop shadow for high-contrast legibility
    uppercase?: boolean;       // Force ALL CAPS (Hormozi style)
}

export interface OverlayRenderOptions {
    cues: SubtitleCue[];
    duration: number;
    videoMode?: CaptionVideoMode;
    style?: CaptionStylePreset; // Backward compatibility
    highlighterColor?: string;
    aspectRatio: VideoAspectRatio;
    background: VideoBackgroundMode;
    typography?: OverlayTypographyOptions;
    fps?: number;
    onProgress?: (percent: number) => void;
}

export const POPULAR_OVERLAY_FONTS = [
    { id: 'montserrat', name: 'Montserrat', family: '"Montserrat", sans-serif' },
    { id: 'bebas-neue', name: 'Bebas Neue', family: '"Bebas Neue", Impact, sans-serif' },
    { id: 'inter', name: 'Inter', family: '"Inter", sans-serif' },
    { id: 'archivo-black', name: 'Archivo Black', family: '"Archivo Black", sans-serif' },
    { id: 'space-mono', name: 'Space Mono', family: '"Space Mono", monospace' },
    { id: 'poppins', name: 'Poppins', family: '"Poppins", sans-serif' },
    { id: 'outfit', name: 'Outfit', family: '"Outfit", sans-serif' },
    { id: 'roboto-black', name: 'Roboto Black', family: '"Roboto", sans-serif' },
    { id: 'nunito-sans', name: 'Nunito Sans', family: '"Nunito Sans", sans-serif' },
];

/**
 * One-tap caption style presets. Each maps directly onto the existing
 * overlay studio controls (video mode, font, pill, motion flags) so the
 * studio's full power is reachable without touching 15 sliders.
 */
export interface CaptionStylePresetConfig {
    id: string;
    name: string;
    videoMode: CaptionVideoMode;
    fontFamily: string;              // font id, e.g. 'montserrat'
    fontSize: number;                // px value matching the studio slider (default 48)
    letterSpacing: number;
    yPositionPercent: number;
    pillBackground: CaptionPillBackground;
    highlighterColor: string;
    springPhysics: boolean;
    bounceIntensity: number;
    wordRotation: boolean;
    wordPop: boolean;
    textShadow: boolean;
    uppercase: boolean;
    emojiMode: boolean;
}

export const CAPTION_STYLE_PRESETS: CaptionStylePresetConfig[] = [
    {
        id: 'tiktok-pop',
        name: 'TikTok Pop',
        videoMode: 'kinetic-pop',
        fontFamily: 'montserrat',
        fontSize: 60,
        letterSpacing: 0,
        yPositionPercent: 76,
        pillBackground: 'dark',
        highlighterColor: '#FFE500',
        springPhysics: true,
        bounceIntensity: 1.2,
        wordRotation: true,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
    {
        id: 'hormozi-bold',
        name: 'Hormozi Bold',
        videoMode: 'kinetic-pop',
        fontFamily: 'archivo-black',
        fontSize: 68,
        letterSpacing: -1,
        yPositionPercent: 72,
        pillBackground: 'dark',
        highlighterColor: '#22C55E',
        springPhysics: true,
        bounceIntensity: 1.45,
        wordRotation: true,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
    {
        id: 'karaoke-stream',
        name: 'Karaoke Stream',
        videoMode: 'teleprompter',
        fontFamily: 'poppins',
        fontSize: 50,
        letterSpacing: 0,
        yPositionPercent: 78,
        pillBackground: 'dark',
        highlighterColor: '#06B6D4',
        springPhysics: true,
        bounceIntensity: 1.15,
        wordRotation: false,
        wordPop: true,
        textShadow: true,
        uppercase: false,
        emojiMode: false,
    },
    {
        id: 'clean-vlog',
        name: 'Clean Vlog',
        videoMode: 'teleprompter',
        fontFamily: 'inter',
        fontSize: 42,
        letterSpacing: 0,
        yPositionPercent: 80,
        pillBackground: 'dark',
        highlighterColor: '#FFFFFF',
        springPhysics: true,
        bounceIntensity: 1,
        wordRotation: false,
        wordPop: false,
        textShadow: false,
        uppercase: false,
        emojiMode: false,
    },
    {
        id: 'cinema-min',
        name: 'Cinema Min',
        videoMode: 'minimal',
        fontFamily: 'space-mono',
        fontSize: 36,
        letterSpacing: 0,
        yPositionPercent: 84,
        pillBackground: 'light',
        highlighterColor: '#FFE500',
        springPhysics: false,
        bounceIntensity: 1,
        wordRotation: false,
        wordPop: false,
        textShadow: false,
        uppercase: false,
        emojiMode: false,
    },
];

const EMOJI_DICTIONARY: Record<string, string> = {
    'money': '💰', 'cash': '💵', 'dollar': '💵', 'dollars': '💵', 'wealth': '💎',
    'time': '⏳', 'clock': '🕒', 'wait': '⏳', 'fast': '⚡', 'quick': '⚡',
    'love': '❤️', 'heart': '❤️', 'like': '👍', 'good': '🔥', 'great': '🔥',
    'fire': '🔥', 'hot': '🔥', 'amazing': '✨', 'magic': '✨', 'stars': '✨',
    'idea': '💡', 'brain': '🧠', 'think': '🤔', 'smart': '🧠',
    'world': '🌍', 'earth': '🌍', 'global': '🌍',
    'sad': '😢', 'cry': '😭', 'happy': '😊', 'smile': '😊',
    'boom': '💥', 'explosion': '💥', 'wow': '😲',
    'music': '🎵', 'song': '🎵', 'sing': '🎤', 'audio': '🎧',
    'video': '🎥', 'camera': '📸', 'movie': '🍿',
    'work': '💼', 'job': '💼', 'office': '🏢',
    'home': '🏠', 'house': '🏠', 'family': '👪',
    'car': '🚗', 'drive': '🚗', 'speed': '🏎️',
    'stop': '🛑', 'go': '🟢', 'warning': '⚠️',
    'book': '📚', 'read': '📖', 'learn': '🎓',
    'eat': '🍔', 'food': '🍕', 'drink': '🥤',
    'sleep': '😴', 'bed': '🛏️', 'night': '🌙',
    'morning': '🌅', 'sun': '☀️', 'day': '☀️',
    'win': '🏆', 'champion': '🏆', 'first': '🥇',
    'code': '💻', 'computer': '💻', 'tech': '📱', 'phone': '📱'
};

function applyEmoji(word: string): string {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (EMOJI_DICTIONARY[cleanWord]) {
        return word + ' ' + EMOJI_DICTIONARY[cleanWord];
    }
    return word;
}

/**
 * Damped harmonic spring physics calculation for word kinetic entrance.
 * Provides snappy overshoot and elastic settling (the signature creator pop).
 *
 * @param progress 0.0 (word start) to 1.0 (word end)
 * @param intensity Spring bounce factor (default 1.1)
 */
export function calculateSpringScale(progress: number, intensity: number = 1.1): number {
    if (progress <= 0) return 0.92;
    if (progress >= 1.0) return 1.0;
    // Harmonic oscillation with exponential decay:
    // Snappy entrance peaking at ~1.28 within first 18% of word duration, then smooth elastic settle
    const t = progress;
    const frequency = 9.5;
    const decay = 5.0;
    const amplitude = 0.32 * intensity;
    const springOffset = amplitude * Math.exp(-decay * t) * Math.sin(frequency * t * Math.PI);
    return Math.max(0.9, 1.0 + springOffset);
}

/**
 * Resolves font string with fallback
 */
function resolveFont(family: string = 'Montserrat', size: number, weight: string = '800'): string {
    const selected = POPULAR_OVERLAY_FONTS.find((f) => f.id === family || f.name.toLowerCase() === family.toLowerCase());
    const familyString = selected ? selected.family : `"${family}", sans-serif`;
    return `${weight} ${size}px ${familyString}`;
}

/**
 * Word layout interfaces for multi-line wrapping
 */
interface LayoutWord {
    word: string;
    index: number;
    width: number;
}

interface LayoutLine {
    words: LayoutWord[];
    width: number;
}

/**
 * Splits words into lines that fit within maxLineWidth
 */
function layoutCaptionLines(
    ctx: CanvasRenderingContext2D,
    words: string[],
    maxLineWidth: number
): LayoutLine[] {
    const spaceWidth = ctx.measureText(' ').width;
    const lines: LayoutLine[] = [];
    let currentWords: LayoutWord[] = [];
    let currentWidth = 0;

    words.forEach((w, idx) => {
        const wordWidth = ctx.measureText(w).width;
        const candidateWidth = currentWords.length === 0
            ? wordWidth
            : currentWidth + spaceWidth + wordWidth;

        if (candidateWidth > maxLineWidth && currentWords.length > 0) {
            lines.push({
                words: currentWords,
                width: currentWidth,
            });
            currentWords = [{ word: w, index: idx, width: wordWidth }];
            currentWidth = wordWidth;
        } else {
            currentWords.push({ word: w, index: idx, width: wordWidth });
            currentWidth = candidateWidth;
        }
    });

    if (currentWords.length > 0) {
        lines.push({
            words: currentWords,
            width: currentWidth,
        });
    }

    return lines;
}

/**
 * Normalizes video mode from either videoMode or legacy style preset
 */
export function resolveVideoMode(videoMode?: CaptionVideoMode, style?: CaptionStylePreset): CaptionVideoMode {
    if (videoMode) return videoMode;
    if (style === 'minimal') return 'minimal';
    if (style === 'hormozi' || style === 'tiktok') return 'kinetic-pop';
    return 'teleprompter';
}

/**
 * Draws a kinetic caption frame onto a 2D canvas context at time `currentTime`
 */
export function drawCaptionFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number,
    cues: SubtitleCue[],
    videoModeOrStyle: CaptionVideoMode | CaptionStylePreset = 'teleprompter',
    background: VideoBackgroundMode = 'transparent',
    highlighterColor: string = '#FFE500',
    typography: OverlayTypographyOptions = {}
) {
    // 1. Clear / Background Fill
    if (background === 'green-screen') {
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(0, 0, width, height);
    } else if (background === 'magenta-screen') {
        ctx.fillStyle = '#FF00FF';
        ctx.fillRect(0, 0, width, height);
    } else {
        // Pure Alpha Transparent
        ctx.clearRect(0, 0, width, height);
    }

    // 2. Find active cue at the current timestamp
    const rawActiveCue = cues.find((c) => currentTime >= c.start && currentTime <= c.end);
    if (!rawActiveCue || !rawActiveCue.text.trim()) {
        // SILENCE / DEAD-AIR: Nothing to render, canvas stays clean/transparent!
        return;
    }

    // 3. Strip all bracketed stage directions like [HOOK], [SILENCE], [PAUSE 3s]
    const cleanedText = cleanStageDirections(rawActiveCue.text);
    if (!cleanedText) {
        // Was only a stage direction cue (e.g. [Silence] or [Hook]) -> Treat as silence!
        return;
    }

    let words = cleanedText.split(/\s+/).filter(Boolean);
    if (words.length === 0) return;

    if (typography.emojiMode) {
        words = words.map(applyEmoji);
    }

    // 4. Compute word-level highlight matching (Acoustic Timestamp Precision)
    let activeWordIndex = -1;
    let wordProgress = 0; // 0..1 progress through the active word

    if (rawActiveCue.words && rawActiveCue.words.length > 0) {
        const cueWords = rawActiveCue.words;

        // 4a. Check if currentTime is currently within a word
        for (let i = 0; i < cueWords.length; i++) {
            const w = cueWords[i];
            if (currentTime >= w.start && currentTime <= w.end) {
                activeWordIndex = i;
                const dur = Math.max(0.06, w.end - w.start);
                wordProgress = Math.min(1, Math.max(0, (currentTime - w.start) / dur));
                break;
            }
        }

        // 4b. Micro-pause between word i and word i+1
        if (activeWordIndex === -1) {
            for (let i = 0; i < cueWords.length - 1; i++) {
                if (currentTime > cueWords[i].end && currentTime < cueWords[i + 1].start) {
                    activeWordIndex = i;
                    wordProgress = 1.0;
                    break;
                }
            }
        }

        // 4c. Past the last word in this cue
        if (activeWordIndex === -1 && currentTime >= cueWords[cueWords.length - 1].end) {
            activeWordIndex = cueWords.length - 1;
            wordProgress = 1.0;
        }

        // CRITICAL: If currentTime < cueWords[0].start:
        // The cue has begun, but word 0 has NOT started yet.
        // activeWordIndex stays -1! All words render in white, ZERO premature highlighting!
    } else {
        // Fallback only if cue completely lacks word timings
        const cueDuration = Math.max(0.05, rawActiveCue.end - rawActiveCue.start);
        const timeInCue = currentTime - rawActiveCue.start;
        if (timeInCue >= 0) {
            const cueProgress = Math.min(Math.max(timeInCue / cueDuration, 0), 1);
            activeWordIndex = Math.min(words.length - 1, Math.floor(cueProgress * words.length));
            const perWordFrac = 1 / words.length;
            const intraWord = (cueProgress - activeWordIndex * perWordFrac) / perWordFrac;
            wordProgress = Math.min(1, Math.max(0, intraWord));
        }
    }

    // Resolve mode
    const mode: CaptionVideoMode = 
        videoModeOrStyle === 'minimal' ? 'minimal' :
        (videoModeOrStyle === 'kinetic-pop' || videoModeOrStyle === 'tiktok' || videoModeOrStyle === 'hormozi') ? 'kinetic-pop' :
        'teleprompter';

    ctx.save();

    const isPortrait = height > width;
    const referenceDimension = isPortrait ? width : height;

    // Typography sizing with user customization
    const scaleFactor = width / (isPortrait ? 1080 : 1920);
    const userFontSize = typography.fontSize ? typography.fontSize * scaleFactor : null;
    const baseFontSize = userFontSize || Math.round(referenceDimension * (isPortrait ? 0.068 : 0.062));

    // Vertical Y position with user customization
    const defaultYPercent = isPortrait ? 78 : 82;
    const yPercent = typography.yPositionPercent !== undefined ? typography.yPositionPercent : defaultYPercent;
    const centerY = (height * yPercent) / 100;

    const fontFamily = typography.fontFamily || 'Montserrat';
    const letterSpacing = typography.letterSpacing || 0;
    const pillBg = typography.pillBackground || 'dark';

    // Apply letter spacing if canvas context supports it
    if ('letterSpacing' in ctx) {
        (ctx as any).letterSpacing = `${letterSpacing}px`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODE 1: TELEPROMPTER WORD-BY-WORD KINETIC HIGHLIGHT (STRICTLY ONE CLEAN LINE)
    // ─────────────────────────────────────────────────────────────────────────
    if (mode === 'teleprompter') {
        const maxAllowedWidth = width * (isPortrait ? 0.88 : 0.82);

        let activeFontSize = baseFontSize;
        ctx.font = resolveFont(fontFamily, activeFontSize, '800');

        // Generous, natural word spacing matching teleprompter DOM layout
        let spaceWidth = Math.max(ctx.measureText(' ').width, Math.round(activeFontSize * 0.34));
        let wordWidths = words.map((w) => ctx.measureText(w).width);
        let totalContentWidth = wordWidths.reduce((a, b) => a + b, 0) + (words.length - 1) * spaceWidth;

        // Guarantee strictly single line: scale font down if text exceeds maxAllowedWidth
        if (totalContentWidth > maxAllowedWidth) {
            activeFontSize = Math.max(16, Math.round(baseFontSize * (maxAllowedWidth / totalContentWidth)));
            ctx.font = resolveFont(fontFamily, activeFontSize, '800');
            spaceWidth = Math.max(ctx.measureText(' ').width, Math.round(activeFontSize * 0.34));
            wordWidths = words.map((w) => ctx.measureText(w).width);
            totalContentWidth = wordWidths.reduce((a, b) => a + b, 0) + (words.length - 1) * spaceWidth;
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const paddingX = Math.round(activeFontSize * 0.45);
        const paddingY = Math.round(activeFontSize * 0.28);
        const pillWidth = totalContentWidth + paddingX * 2;
        const pillHeight = Math.round(activeFontSize * 1.85);
        const pillTop = centerY - pillHeight / 2;

        // Draw caption pill capsule
        if (pillBg !== 'clear') {
            ctx.save();
            if (pillBg === 'light') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
            } else if (pillBg === 'custom') {
                ctx.fillStyle = typography.pillCustomColor || 'rgba(0, 0, 0, 0.88)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            } else {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            }

            ctx.beginPath();
            ctx.roundRect((width - pillWidth) / 2, pillTop, pillWidth, pillHeight, Math.round(activeFontSize * 0.26));
            ctx.fill();

            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        }

        // Calculate positions for each word
        const startX = (width - totalContentWidth) / 2;
        const wordLefts: number[] = [];
        const wordCenters: number[] = [];
        let curX = startX;

        words.forEach((w, idx) => {
            wordLefts.push(curX);
            wordCenters.push(curX + wordWidths[idx] / 2);
            curX += wordWidths[idx] + spaceWidth;
        });

        // TELEPROMPTER KINETIC HIGHLIGHT GLIDE:
        // Render smooth gliding highlight pill behind the active spoken word
        if (activeWordIndex >= 0 && activeWordIndex < words.length) {
            const padX = Math.round(activeFontSize * 0.16);
            const padY = Math.round(activeFontSize * 0.12);
            const curLeft = wordLefts[activeWordIndex] - padX;
            const curW = wordWidths[activeWordIndex] + padX * 2;

            let pillBoxX = curLeft;
            let pillBoxW = curW;

            // Liquid glide toward next word during transition (last 20% of word duration)
            if (activeWordIndex < words.length - 1 && wordProgress > 0.80) {
                const nextLeft = wordLefts[activeWordIndex + 1] - padX;
                const nextW = wordWidths[activeWordIndex + 1] + padX * 2;
                const glideFrac = (wordProgress - 0.80) / 0.20;
                // Organic smoothstep easing
                const ease = glideFrac * glideFrac * (3 - 2 * glideFrac);
                pillBoxX = curLeft + (nextLeft - curLeft) * ease;
                pillBoxW = curW + (nextW - curW) * ease;
            }

            ctx.save();
            ctx.fillStyle = highlighterColor;
            ctx.beginPath();
            ctx.roundRect(
                pillBoxX,
                centerY - activeFontSize / 2 - padY,
                pillBoxW,
                activeFontSize + padY * 2,
                Math.round(activeFontSize * 0.16)
            );
            ctx.fill();
            ctx.restore();
        }

        // Render each word with exact teleprompter contrast hierarchy
        words.forEach((w, idx) => {
            const wordCenterX = wordCenters[idx];
            const isCurrent = idx === activeWordIndex;
            const isPast = activeWordIndex >= 0 && idx < activeWordIndex;

            ctx.save();
            ctx.translate(wordCenterX, centerY);

            if (isCurrent) {
                // Word Pop: spring-scaled karaoke bounce on the spoken word.
                // Scaling happens around the word center (translated above), so the
                // word pops in place while the gliding highlighter pill stays smooth.
                if (typography.wordPop) {
                    const scaleVal = calculateSpringScale(wordProgress, typography.bounceIntensity ?? 1.15);
                    ctx.scale(scaleVal, scaleVal);
                    if (typography.textShadow) {
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
                        ctx.shadowBlur = 8;
                        ctx.shadowOffsetY = 3;
                    }
                }
                // High contrast dark text on active highlighter pill
                ctx.fillStyle = '#000000';
                ctx.fillText(w, 0, 0);
            } else {
                if (pillBg === 'clear') {
                    ctx.lineWidth = Math.max(3, activeFontSize * 0.12);
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
                    ctx.lineJoin = 'round';
                    ctx.strokeText(w, 0, 0);
                }

                if (pillBg === 'light') {
                    ctx.fillStyle = isPast ? 'rgba(0, 0, 0, 0.40)' : '#000000';
                } else {
                    // Muted past words, crisp bright white upcoming words (just like teleprompter!)
                    ctx.fillStyle = isPast ? 'rgba(255, 255, 255, 0.45)' : '#FFFFFF';
                }
                ctx.fillText(w, 0, 0);
            }

            ctx.restore();
        });

    // ─────────────────────────────────────────────────────────────────────────
    // MODE 2: KINETIC POP (Punchy 2-3 Word Creator Pop with Heavy Stroke)
    // ─────────────────────────────────────────────────────────────────────────
    } else if (mode === 'kinetic-pop') {
        const windowSize = 3;
        const startIdx = Math.max(0, Math.min(words.length - windowSize, activeWordIndex - 1));
        const visibleWords = words.slice(startIdx, startIdx + windowSize);

        let popFontSize = Math.round(baseFontSize * 1.2);
        ctx.font = resolveFont(fontFamily, popFontSize, '900');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const totalText = visibleWords.join(' ');
        let totalWidth = ctx.measureText(totalText).width;
        const maxWidth = width * 0.88;

        // Auto shrink if 3 long words exceed screen width
        if (totalWidth > maxWidth) {
            popFontSize = Math.round(popFontSize * (maxWidth / totalWidth));
            ctx.font = resolveFont(fontFamily, popFontSize, '900');
            totalWidth = ctx.measureText(totalText).width;
        }

        const startX = (width - totalWidth) / 2;
        let currentX = startX;

        visibleWords.forEach((rawWord, relativeIdx) => {
            const absoluteIdx = startIdx + relativeIdx;
            const isCurrent = absoluteIdx === activeWordIndex;
            const word = typography.uppercase ? rawWord.toUpperCase() : rawWord;
            const wordWidth = ctx.measureText(word + ' ').width;
            const wordCenterX = currentX + wordWidth / 2;

            ctx.save();
            ctx.translate(wordCenterX, centerY);

            if (isCurrent) {
                // Kinetic Scale Pop with Damped Spring Physics Engine
                let scaleVal = 1.15;
                if (typography.springPhysics !== false) {
                    scaleVal = calculateSpringScale(wordProgress, typography.bounceIntensity ?? 1.15);
                }
                ctx.scale(scaleVal, scaleVal);

                // Optional subtle tilt rotation (-2.2deg to +2.2deg)
                if (typography.wordRotation) {
                    const tiltDeg = (absoluteIdx % 2 === 0 ? -2.2 : 2.2) * (1 - wordProgress * 0.75);
                    ctx.rotate((tiltDeg * Math.PI) / 180);
                }

                // Optional Drop Shadow for high readability against bright scenes
                if (typography.textShadow) {
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
                    ctx.shadowBlur = 10;
                    ctx.shadowOffsetY = 4;
                }

                // Heavy Black Stroke Outline
                ctx.lineWidth = Math.max(6, popFontSize * 0.18);
                ctx.strokeStyle = '#000000';
                ctx.lineJoin = 'round';
                ctx.strokeText(word, 0, 0);

                ctx.shadowColor = 'transparent';

                // Highlight Color Fill
                ctx.fillStyle = highlighterColor;
                ctx.fillText(word, 0, 0);
            } else {
                if (typography.textShadow) {
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
                    ctx.shadowBlur = 8;
                    ctx.shadowOffsetY = 3;
                }

                // Outer Black Stroke
                ctx.lineWidth = Math.max(5, popFontSize * 0.14);
                ctx.strokeStyle = '#000000';
                ctx.lineJoin = 'round';
                ctx.strokeText(word, 0, 0);

                ctx.shadowColor = 'transparent';

                // Crisp White Fill
                ctx.fillStyle = pillBg === 'light' ? '#FFE500' : '#FFFFFF';
                ctx.fillText(word, 0, 0);
            }

            ctx.restore();
            currentX += wordWidth;
        });

    // ─────────────────────────────────────────────────────────────────────────
    // MODE 3: MINIMAL CLEAN (Small, Crisp TV / Film Subtitles - Strictly Single Line)
    // ─────────────────────────────────────────────────────────────────────────
    } else {
        const fullLine = words.join(' ');
        const minimalSize = Math.round(baseFontSize * 0.65);
        const maxAllowedWidth = width * (isPortrait ? 0.88 : 0.80);

        let activeSize = minimalSize;
        ctx.font = resolveFont(fontFamily, activeSize, '600');
        let fullWidth = ctx.measureText(fullLine).width;

        if (fullWidth > maxAllowedWidth) {
            activeSize = Math.max(16, Math.round(minimalSize * (maxAllowedWidth / fullWidth)));
            ctx.font = resolveFont(fontFamily, activeSize, '600');
            fullWidth = ctx.measureText(fullLine).width;
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const paddingX = 18;
        const pillWidth = fullWidth + paddingX * 2;
        const pillHeight = Math.round(activeSize * 1.85);
        const pillTop = centerY - pillHeight / 2;

        if (pillBg !== 'clear') {
            ctx.save();
            if (pillBg === 'light') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
            } else if (pillBg === 'custom') {
                ctx.fillStyle = typography.pillCustomColor || 'rgba(0, 0, 0, 0.80)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            } else {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.80)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            }
            ctx.beginPath();
            ctx.roundRect((width - pillWidth) / 2, pillTop, pillWidth, pillHeight, 6);
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }

        if (pillBg === 'clear') {
            ctx.lineWidth = Math.max(3, activeSize * 0.12);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.lineJoin = 'round';
            ctx.strokeText(fullLine, width / 2, centerY);
        }

        ctx.fillStyle = pillBg === 'light' ? '#000000' : '#FFFFFF';
        ctx.fillText(fullLine, width / 2, centerY);
    }

    ctx.restore();
}

/**
 * Renders and exports the subtitle cues as a transparent or green-screen video file (Blob).
 */
export async function renderCaptionsToVideo(
    options: OverlayRenderOptions
): Promise<Blob> {
    const {
        cues,
        duration,
        videoMode,
        style,
        highlighterColor = '#FFE500',
        aspectRatio,
        background,
        typography = {},
        fps = 30,
        onProgress,
    } = options;

    const resolvedMode = resolveVideoMode(videoMode, style);
    const width = aspectRatio === '9:16' ? 1080 : 1920;
    const height = aspectRatio === '9:16' ? 1920 : 1080;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { alpha: background === 'transparent' });
    if (!ctx) throw new Error('Could not obtain 2D canvas rendering context.');

    // Determine codec (VP9 supports transparent alpha channel)
    let mimeType = 'video/webm; codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
    }

    const stream = canvas.captureStream(fps);
    const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 12_000_000, // 12 Mbps for razor-sharp typography
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve, reject) => {
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            resolve(blob);
        };

        mediaRecorder.onerror = (err) => {
            reject(err);
        };

        mediaRecorder.start();

        const frameDuration = 1 / fps;
        let currentTime = 0;

        function renderNextFrame() {
            if (currentTime > duration) {
                setTimeout(() => {
                    mediaRecorder.stop();
                }, 250);
                return;
            }

            if (ctx) {
                drawCaptionFrame(
                    ctx,
                    width,
                    height,
                    currentTime,
                    cues,
                    resolvedMode,
                    background,
                    highlighterColor,
                    typography
                );
            }

            const percent = Math.min(100, Math.round((currentTime / Math.max(0.1, duration)) * 100));
            onProgress?.(percent);

            currentTime += frameDuration;
            // Accelerated frame recording
            setTimeout(renderNextFrame, 1000 / (fps * 2));
        }

        renderNextFrame();
    });
}
