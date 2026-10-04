/**
 * Video Overlay Renderer for CreatorsKit Auto Captions
 * ====================================================
 * Renders animated, timestamped kinetic captions directly onto an HTML5 Canvas
 * and exports as a green-key MP4 (deterministic WebCodecs H.264 via the shared
 * canvas-video-exporter) for direct overlay onto video timelines in Premiere Pro,
 * DaVinci Resolve, Final Cut, and CapCut.
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
 * - Zero excessive emojis. Clean brutalist design matching CreatorsKit Studio.
 */

import { SubtitleCue, cleanStageDirections } from './vtt-formatter';
import { exportCanvasVideoToMp4 } from '@/lib/canvas-video-exporter';
import { accumulateMotionBlur, impactShake, springScale } from '@/lib/motion';

export type CaptionVideoMode = 'teleprompter' | 'kinetic-pop' | 'minimal';
export type CaptionStylePreset = CaptionVideoMode | 'tiktok' | 'hormozi'; // Backward compatibility
export type VideoAspectRatio = '9:16' | '16:9';
export type VideoBackgroundMode = 'transparent' | 'green-screen' | 'magenta-screen';

export type CaptionPillBackground = 'clear' | 'dark' | 'light' | 'custom';

/**
 * Artistic treatment of the ACTIVE spoken word in kinetic-pop mode.
 * 'fill' is the classic colored fill; the rest mirror the highlight
 * vocabulary already used by match-cut / text-highlighter so caption
 * styles stay cohesive across the suite.
 */
export type ActiveWordEffect = 'fill' | 'marker' | 'box' | 'underline' | 'glow';

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
    activeWordEffect?: ActiveWordEffect; // kinetic-pop active word treatment
    glowColor?: string;        // halo color for the 'glow' effect
    tapeBackdrop?: boolean;    // translucent masking-tape band behind the window
    shakeIntensity?: number;   // MOTION-AS-CODE: decaying-sine impact shake on each spoken word onset (0 = off, ~1.25 = strong)
    motionBlurSamples?: number; // MOTION-AS-CODE: sub-frames averaged per output frame at export (1 = off, 4-8 = cinematic blur)
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
    /** Deliberately delay the caption timeline: at video time t, the frame
     * shows the caption state of (t - delay). Positive = captions later. */
    delaySeconds?: number;
    audioBuffer?: AudioBuffer | null;
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
    pillCustomColor?: string;
    highlighterColor: string;
    springPhysics: boolean;
    bounceIntensity: number;
    wordRotation: boolean;
    wordPop: boolean;
    textShadow: boolean;
    uppercase: boolean;
    emojiMode: boolean;
    activeWordEffect: ActiveWordEffect;
    glowColor?: string;
    tapeBackdrop: boolean;
    shakeIntensity?: number;   // word-onset impact shake (omitted/0 = off)
    motionBlurSamples?: number; // export-time sub-frame motion blur (omitted/1 = off)
}

export const CAPTION_STYLE_PRESETS: CaptionStylePresetConfig[] = [
    {
        // The everyday driver: big clean uppercase pop, yellow active word,
        // restrained spring settle, anchored at the top of the bottom third.
        id: 'creator-pop',
        name: 'Creator Pop',
        videoMode: 'kinetic-pop',
        fontFamily: 'montserrat',
        fontSize: 56,
        letterSpacing: 0,
        yPositionPercent: 70,
        pillBackground: 'dark',
        highlighterColor: '#FFE500',
        activeWordEffect: 'fill',
        tapeBackdrop: false,
        springPhysics: true,
        bounceIntensity: 1.0,
        wordRotation: false,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
    {
        // Maximum punch for short-form hooks: heavier face, green highlight,
        // slightly stronger pop — still settles naturally, no wobble.
        id: 'hormozi-punch',
        name: 'Hormozi Punch',
        videoMode: 'kinetic-pop',
        fontFamily: 'archivo-black',
        fontSize: 60,
        letterSpacing: -1,
        yPositionPercent: 70,
        pillBackground: 'dark',
        highlighterColor: '#22C55E',
        activeWordEffect: 'fill',
        tapeBackdrop: false,
        springPhysics: true,
        bounceIntensity: 1.15,
        wordRotation: false,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
    {
        // Kinetic variation 2: condensed tall Bebas face + alternating tilt
        // on every spoken word + cyan fill — the classic TikTok edit energy.
        id: 'tiktok-tilt',
        name: 'TikTok Tilt',
        videoMode: 'kinetic-pop',
        fontFamily: 'bebas-neue',
        fontSize: 64,
        letterSpacing: 0,
        yPositionPercent: 70,
        pillBackground: 'dark',
        highlighterColor: '#06B6D4',
        activeWordEffect: 'fill',
        tapeBackdrop: false,
        springPhysics: true,
        bounceIntensity: 1.25,
        wordRotation: true,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
    {
        // Kinetic variation 3: heaviest face on the list, orange active word,
        // yellow inactive words — a two-tone boxing-poster punch that stays
        // readable on any background.
        id: 'bold-boxing',
        name: 'Bold Boxing',
        videoMode: 'kinetic-pop',
        fontFamily: 'archivo-black',
        fontSize: 66,
        letterSpacing: -1.5,
        yPositionPercent: 68,
        pillBackground: 'light',
        highlighterColor: '#F97316',
        activeWordEffect: 'fill',
        tapeBackdrop: false,
        springPhysics: true,
        bounceIntensity: 1.3,
        wordRotation: false,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
    {
        // Kinetic variation 4: hot-pink active word on Poppins with the
        // hardest bounce in the family — pure neon shortform energy.
        id: 'neon-burst',
        name: 'Neon Burst',
        videoMode: 'kinetic-pop',
        fontFamily: 'poppins',
        fontSize: 62,
        letterSpacing: 0,
        yPositionPercent: 70,
        pillBackground: 'dark',
        highlighterColor: '#EC4899',
        activeWordEffect: 'fill',
        tapeBackdrop: false,
        springPhysics: true,
        bounceIntensity: 1.35,
        wordRotation: false,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
    {
        // Kinetic variation 5: Roboto Black + violet active word — a
        // cooler, techy pop that still reads huge on any background.
        id: 'viral-violet',
        name: 'Viral Violet',
        videoMode: 'kinetic-pop',
        fontFamily: 'roboto-black',
        fontSize: 62,
        letterSpacing: -0.5,
        yPositionPercent: 71,
        pillBackground: 'dark',
        highlighterColor: '#A78BFA',
        activeWordEffect: 'fill',
        tapeBackdrop: false,
        springPhysics: true,
        bounceIntensity: 1.2,
        wordRotation: false,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
    {
        // Marker vocabulary on captions: the highlighter bar wipes in
        // behind the spoken word, black type on top — same energy as
        // match-cut's marker style.
        id: 'marker-swipe',
        name: 'Marker Swipe',
        videoMode: 'kinetic-pop',
        fontFamily: 'montserrat',
        fontSize: 60,
        letterSpacing: 0,
        yPositionPercent: 72,
        pillBackground: 'clear',
        highlighterColor: '#FFE500',
        activeWordEffect: 'marker',
        tapeBackdrop: false,
        springPhysics: true,
        bounceIntensity: 1.05,
        wordRotation: false,
        wordPop: false,
        textShadow: false,
        uppercase: true,
        emojiMode: false,
    },
    {
        // Lit-sign look: cyan halo passes under a crisp white core.
        id: 'neon-sign',
        name: 'Neon Sign',
        videoMode: 'kinetic-pop',
        fontFamily: 'outfit',
        fontSize: 62,
        letterSpacing: 0,
        yPositionPercent: 70,
        pillBackground: 'dark',
        highlighterColor: '#22D3EE',
        activeWordEffect: 'glow',
        glowColor: '#22D3EE',
        tapeBackdrop: false,
        springPhysics: true,
        bounceIntensity: 1.15,
        wordRotation: false,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
    {
        // Boxing-poster annotation: dashed hand-box around the spoken
        // word; white type keeps the accent color as the marker.
        id: 'coach-box',
        name: 'Coach Box',
        videoMode: 'kinetic-pop',
        fontFamily: 'archivo-black',
        fontSize: 56,
        letterSpacing: -1,
        yPositionPercent: 69,
        pillBackground: 'clear',
        highlighterColor: '#F43F5E',
        activeWordEffect: 'box',
        tapeBackdrop: false,
        springPhysics: true,
        bounceIntensity: 1.25,
        wordRotation: true,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
    {
        // Swipe underline: a lime bar grows under the spoken word —
        // the text-highlighter underline, on video.
        id: 'swipe-underline',
        name: 'Swipe Underline',
        videoMode: 'kinetic-pop',
        fontFamily: 'poppins',
        fontSize: 58,
        letterSpacing: 0,
        yPositionPercent: 70,
        pillBackground: 'dark',
        highlighterColor: '#A3E635',
        activeWordEffect: 'underline',
        tapeBackdrop: false,
        springPhysics: true,
        bounceIntensity: 1.1,
        wordRotation: false,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
    {
        // Masking-tape texture: the whole word window sits on a tilted
        // translucent tape band, crimson active word on top.
        id: 'tape-label',
        name: 'Tape Label',
        videoMode: 'kinetic-pop',
        fontFamily: 'space-mono',
        fontSize: 54,
        letterSpacing: 0,
        yPositionPercent: 70,
        pillBackground: 'clear',
        highlighterColor: '#DC2626',
        activeWordEffect: 'fill',
        tapeBackdrop: true,
        springPhysics: true,
        bounceIntensity: 1.0,
        wordRotation: false,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
    {
        // Teleprompter mode with the karaoke spring-pop switched ON —
        // the glide pill plus a bouncing spoken word.
        id: 'karaoke-pop',
        name: 'Karaoke Pop',
        videoMode: 'teleprompter',
        fontFamily: 'montserrat',
        fontSize: 52,
        letterSpacing: 0,
        yPositionPercent: 72,
        pillBackground: 'dark',
        highlighterColor: '#FFE500',
        activeWordEffect: 'fill',
        tapeBackdrop: false,
        springPhysics: true,
        bounceIntensity: 1.2,
        wordRotation: false,
        wordPop: true,
        textShadow: true,
        uppercase: false,
        emojiMode: false,
    },
    {
        // Minimal mode finally gets a preset: clean TV/film lower-third
        // bar, spoken-only reveal, zero bounce.
        id: 'clean-studio',
        name: 'Clean Studio',
        videoMode: 'minimal',
        fontFamily: 'inter',
        fontSize: 46,
        letterSpacing: 0,
        yPositionPercent: 76,
        pillBackground: 'dark',
        highlighterColor: '#FFE500',
        activeWordEffect: 'fill',
        tapeBackdrop: false,
        springPhysics: false,
        bounceIntensity: 1.0,
        wordRotation: false,
        wordPop: false,
        textShadow: true,
        uppercase: false,
        emojiMode: false,
    },
    {
        // Ember neon: warm orange halo — hype-video energy that stays
        // legible on dark footage.
        id: 'ember-glow',
        name: 'Ember Glow',
        videoMode: 'kinetic-pop',
        fontFamily: 'nunito-sans',
        fontSize: 60,
        letterSpacing: 0,
        yPositionPercent: 70,
        pillBackground: 'dark',
        highlighterColor: '#FB923C',
        activeWordEffect: 'glow',
        glowColor: '#FB923C',
        tapeBackdrop: false,
        springPhysics: true,
        bounceIntensity: 1.2,
        wordRotation: false,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
    },
    {
        // Motion-as-code flagship: every spoken word onset fires a
        // decaying-sine impact shake, and the export averages sub-frames
        // across each exposure window for true temporal motion blur.
        id: 'impact-shake',
        name: 'Impact Shake',
        videoMode: 'kinetic-pop',
        fontFamily: 'archivo-black',
        fontSize: 62,
        letterSpacing: -1,
        yPositionPercent: 70,
        pillBackground: 'dark',
        highlighterColor: '#EF4444',
        activeWordEffect: 'fill',
        tapeBackdrop: false,
        springPhysics: true,
        bounceIntensity: 1.25,
        wordRotation: false,
        wordPop: false,
        textShadow: true,
        uppercase: true,
        emojiMode: false,
        shakeIntensity: 1.25,
        motionBlurSamples: 4,
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
 * Delegates to the shared motion-as-code engine (`springScale`) so the
 * caption pop, match-cut sweep and any future plate share one curve.
 *
 * @param progress 0.0 (word start) to 1.0 (word end)
 * @param intensity Spring bounce factor (default 1.1)
 */
export function calculateSpringScale(progress: number, intensity: number = 1.1): number {
    return springScale(progress, intensity);
}

/**
 * Resolves font string with fallback
 */
function resolveFont(family: string = 'Montserrat', size: number, weight: string = '800'): string {
    const selected = POPULAR_OVERLAY_FONTS.find((f) => f.id === family || f.name.toLowerCase() === family.toLowerCase());
    const familyString = selected ? selected.family : `"${family}", sans-serif`;
    return `${weight} ${size}px ${familyString}`;
}

/** How long the final word of a cue stays highlighted after it ends (s). */
const LAST_WORD_HOLD_S = 0.45;

/**
 * Fonts that only exist in a single weight (or lack a 600/800/900 axis)
 * on Google Fonts — load exactly what exists instead of synthesizing.
 */
const FONT_WEIGHT_HINTS: Record<string, string[]> = {
    'bebas-neue': ['400'],
    'archivo-black': ['400'],
    'space-mono': ['400', '700'],
};

/**
 * Canvas does NOT wait for webfonts: draw before the Google font arrives
 * and canvas silently bakes in a system fallback face (the "terrible
 * typography" bug). Await the exact faces this renderer draws with.
 */
export async function ensureOverlayFontReady(fontFamily: string): Promise<void> {
    if (typeof document === 'undefined' || !document.fonts?.load) return;
    const selected = POPULAR_OVERLAY_FONTS.find(
        (f) => f.id === fontFamily || f.name.toLowerCase() === fontFamily.toLowerCase()
    );
    if (!selected) return; // custom family — nothing reliable to await
    const bare = selected.family.split(',')[0].replace(/"/g, '').trim();
    const weights = FONT_WEIGHT_HINTS[selected.id] ?? ['600', '800', '900'];
    try {
        await Promise.all(weights.map((w) => document.fonts.load(`${w} 48px "${bare}"`)));
        await document.fonts.ready;
    } catch {
        /* best effort — canvas falls back to a system font */
    }
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

        // 4c. Past the last word in this cue — hold the final highlight for a
        // short grace period only, then go dark. Without this cap the last
        // word stays lit through trailing silence, which reads as the app
        // "highlighting words nobody is saying".
        if (activeWordIndex === -1 && currentTime >= cueWords[cueWords.length - 1].end) {
            if (currentTime <= cueWords[cueWords.length - 1].end + LAST_WORD_HOLD_S) {
                activeWordIndex = cueWords.length - 1;
                wordProgress = 1.0;
            }
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
    // Default sits at the TOP of the bottom third of the screen so
    // captions never fight the TikTok/YouTube UI chrome at the very
    // bottom, and never cover the subject's face in the middle.
    const defaultYPercent = isPortrait ? 70 : 74;
    const yPercent = typography.yPositionPercent !== undefined ? typography.yPositionPercent : defaultYPercent;
    const centerY = (height * yPercent) / 100;

    const fontFamily = typography.fontFamily || 'Montserrat';
    const letterSpacing = typography.letterSpacing || 0;
    const pillBg = typography.pillBackground || 'dark';

    // Apply letter spacing if canvas context supports it
    if ('letterSpacing' in ctx) {
        (ctx as any).letterSpacing = `${letterSpacing}px`;
    }

    // ─────────────────────────────────────────────────────────────────────
    // MOTION-AS-CODE IMPACT SHAKE
    // A decaying-sine camera flinch anchored to the ACTIVE WORD's onset
    // timestamp (cue start as fallback). Pure function of (currentTime,
    // word timings): the live preview loop and the deterministic export
    // produce the exact same shake. Skipped in minimal mode — clean TV
    // subtitles should never flinch.
    // ─────────────────────────────────────────────────────────────────────
    const shakeIntensity = typography.shakeIntensity ?? 0;
    if (shakeIntensity > 0 && mode !== 'minimal') {
        const wordStart = activeWordIndex >= 0
            ? rawActiveCue.words?.[activeWordIndex]?.start
            : undefined;
        const triggerStart = wordStart ?? rawActiveCue.start;
        const shake = impactShake(currentTime - triggerStart, {
            amplitudePx: baseFontSize * 0.05 * shakeIntensity,
            frequencyHz: 26,
            decayPerSec: 13,
            maxRotationRad: 0.006,
        });
        if (shake.envelope > 0.001) {
            ctx.translate(shake.x, shake.y);
            ctx.rotate(shake.rot);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODE 1: TELEPROMPTER WORD-BY-WORD KINETIC HIGHLIGHT (STRICTLY ONE CLEAN LINE)
    // ─────────────────────────────────────────────────────────────────────────
    if (mode === 'teleprompter') {
        // SPOKEN-ONLY REVEAL: a word appears the moment it is said — never
        // before. Nothing renders until the first word starts; past words
        // dim; the imminent next word pre-reveals during the glide window
        // (last 20% of the current word) so the karaoke glide lands on it.
        const glideIntoNext =
            activeWordIndex >= 0 && activeWordIndex < words.length - 1 && wordProgress > 0.80;
        const visibleCount = activeWordIndex < 0 ? 0 : glideIntoNext ? activeWordIndex + 2 : activeWordIndex + 1;
        if (visibleCount <= 0) {
            ctx.restore();
            return;
        }
        const visibleWords = words.slice(0, Math.min(visibleCount, words.length));

        // Safe area: cap the line at 80% of portrait width (~10%
        // margins each side) so text clears TikTok/YouTube UI.
        const maxAllowedWidth = width * (isPortrait ? 0.80 : 0.84);

        let activeFontSize = baseFontSize;
        ctx.font = resolveFont(fontFamily, activeFontSize, '800');

        // Generous, natural word spacing matching teleprompter DOM layout
        let spaceWidth = Math.max(ctx.measureText(' ').width, Math.round(activeFontSize * 0.34));
        let wordWidths = visibleWords.map((w) => ctx.measureText(w).width);
        let totalContentWidth = wordWidths.reduce((a, b) => a + b, 0) + (visibleWords.length - 1) * spaceWidth;

        // Guarantee strictly single line: scale font down if text exceeds maxAllowedWidth
        if (totalContentWidth > maxAllowedWidth) {
            activeFontSize = Math.max(16, Math.round(baseFontSize * (maxAllowedWidth / totalContentWidth)));
            ctx.font = resolveFont(fontFamily, activeFontSize, '800');
            spaceWidth = Math.max(ctx.measureText(' ').width, Math.round(activeFontSize * 0.34));
            wordWidths = visibleWords.map((w) => ctx.measureText(w).width);
            totalContentWidth = wordWidths.reduce((a, b) => a + b, 0) + (visibleWords.length - 1) * spaceWidth;
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
        if (activeWordIndex >= 0 && activeWordIndex < visibleWords.length) {
            // Tighter box — the old 0.16/0.12 pads + full-radius corners
            // made the highlight feel heavy ("a bit too much").
            const padX = Math.round(activeFontSize * 0.11);
            const padY = Math.round(activeFontSize * 0.09);
            const curLeft = wordLefts[activeWordIndex] - padX;
            const curW = wordWidths[activeWordIndex] + padX * 2;

            let pillBoxX = curLeft;
            let pillBoxW = curW;

            // Liquid glide toward next word during transition (last 20% of word duration)
            if (activeWordIndex < visibleWords.length - 1 && wordProgress > 0.80) {
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
                Math.round(activeFontSize * 0.12)
            );
            ctx.fill();
            ctx.restore();
        }

        // Render each (revealed) word with exact teleprompter contrast hierarchy
        visibleWords.forEach((w, idx) => {
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
        // Safe area: pop captions cap at ~78% of portrait width (~11%
        // margins each side) — comfortably inside platform UI zones.
        const maxWidth = width * (isPortrait ? 0.78 : 0.84);

        // Fit a window of spoken words: measure the text EXACTLY as it
        // will be drawn (uppercase aware), shrink to fit the safe area,
        // and if three words would get squeezed unnaturally small,
        // drop to TWO words — short punchy beats, never a shrunken line.
        const fitWindow = (size: number) => {
            const idx = Math.max(0, Math.min(words.length - size, activeWordIndex - 1));
            const vis = words.slice(idx, idx + size);
            const styled = vis.map((raw) => (typography.uppercase ? raw.toUpperCase() : raw));
            const meas = (fontPx: number) => {
                ctx.font = resolveFont(fontFamily, fontPx, '900');
                const widths = styled.map((t) => ctx.measureText(t).width);
                const gap = Math.max(6, Math.round(fontPx * 0.28));
                const total = widths.reduce((sum, w) => sum + w, 0) + gap * (styled.length - 1);
                return { widths, gap, total };
            };
            let fontPx = Math.round(baseFontSize * 1.2);
            let mm = meas(fontPx);
            if (mm.total > maxWidth) {
                fontPx = Math.max(18, Math.round(fontPx * (maxWidth / mm.total)));
                mm = meas(fontPx);
            }
            return { startIdx: idx, visibleWords: vis, styledWords: styled, popFontSize: fontPx, m: mm };
        };

        let win = fitWindow(3);
        if (win.popFontSize < Math.round(baseFontSize * 0.62) && words.length >= 3) {
            win = fitWindow(2);
        }
        const { startIdx, visibleWords, styledWords, popFontSize, m } = win;

        ctx.font = resolveFont(fontFamily, popFontSize, '900');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Masking-tape backdrop (preset-driven texture): a translucent
        // tape band behind the whole word window, tilted a hair — the
        // match-cut "tape" vocabulary on captions. Drawn beneath every
        // word so pops and strokes land ON the tape.
        if (typography.tapeBackdrop) {
            ctx.save();
            ctx.translate(width / 2, centerY);
            ctx.rotate((-1.6 * Math.PI) / 180);
            const tapeH = Math.round(popFontSize * 1.9);
            const tapeW = m.total + Math.round(popFontSize * 1.1);
            ctx.fillStyle = 'rgba(255, 219, 89, 0.92)';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-tapeW / 2, -tapeH / 2, tapeW, tapeH, 6);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        let currentX = (width - m.total) / 2;

        visibleWords.forEach((_rawWord, relativeIdx) => {
            const absoluteIdx = startIdx + relativeIdx;
            const isCurrent = absoluteIdx === activeWordIndex;
            const word = styledWords[relativeIdx];
            const wordCenterX = currentX + m.widths[relativeIdx] / 2;

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

                const effect: ActiveWordEffect = typography.activeWordEffect || 'fill';
                const wordW = m.widths[relativeIdx];

                // Marker-swipe: a REAL highlighter pass — the bar travels
                // LEFT→RIGHT across the word (the old center-out expansion
                // read as a blob, not a swipe), hugs the optical text zone,
                // and slightly overshoots like a felt tip reaching the last
                // letter.
                if (effect === 'marker') {
                    const swipe = Math.min(1, wordProgress / 0.5);
                    const pad = popFontSize * 0.14;
                    const barW = (wordW + pad * 2) * (0.14 + 0.86 * swipe);
                    ctx.fillStyle = highlighterColor;
                    ctx.beginPath();
                    ctx.roundRect(-wordW / 2 - pad, -popFontSize * 0.6, barW, popFontSize * 1.12, popFontSize * 0.06);
                    ctx.fill();
                }

                // Heavy Black Stroke Outline — EXCEPT marker: a fat outline
                // over the yellow bar turns to mud; the highlighter look
                // needs crisp black type sitting clean on the marker pass.
                ctx.lineWidth = effect === 'marker'
                    ? Math.max(3, popFontSize * 0.05)
                    : Math.max(6, popFontSize * 0.18);
                ctx.strokeStyle = '#000000';
                ctx.lineJoin = 'round';
                ctx.strokeText(word, 0, 0);

                ctx.shadowColor = 'transparent';

                if (effect === 'glow') {
                    // Neon: two halo passes in the glow color, then a crisp
                    // white core — a lit sign, not a blurry mess.
                    const glow = typography.glowColor || highlighterColor;
                    ctx.save();
                    ctx.shadowColor = glow;
                    ctx.shadowBlur = Math.max(18, popFontSize * 0.42);
                    ctx.fillStyle = glow;
                    ctx.fillText(word, 0, 0);
                    ctx.fillText(word, 0, 0);
                    ctx.restore();
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(word, 0, 0);
                } else if (effect === 'marker') {
                    ctx.fillStyle = '#000000';
                    ctx.fillText(word, 0, 0);
                } else {
                    // 'fill' (classic), plus 'box'/'underline' which keep a
                    // white fill so the annotation color stays the accent.
                    ctx.fillStyle = effect === 'fill' ? highlighterColor : '#FFFFFF';
                    ctx.fillText(word, 0, 0);
                }

                // Hand-boxed annotation: dashed rect around the spoken
                // word, pulsing with the same spring scale.
                if (effect === 'box') {
                    const padX = popFontSize * 0.24;
                    const padY = popFontSize * 0.46;
                    ctx.lineWidth = Math.max(6, popFontSize * 0.085);
                    ctx.strokeStyle = highlighterColor;
                    ctx.setLineDash([popFontSize * 0.42, popFontSize * 0.22]);
                    ctx.strokeRect(-wordW / 2 - padX, -padY, wordW + padX * 2, padY * 2);
                    ctx.setLineDash([]);
                }

                // Swipe underline: grows left→right with the spoken word.
                if (effect === 'underline') {
                    const swipe = Math.min(1, wordProgress / 0.6);
                    const barH = Math.max(5, popFontSize * 0.13);
                    ctx.fillStyle = highlighterColor;
                    ctx.beginPath();
                    ctx.roundRect(-wordW / 2, popFontSize * 0.62, wordW * swipe, barH, barH / 2);
                    ctx.fill();
                }
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
            currentX += m.widths[relativeIdx] + (relativeIdx < styledWords.length - 1 ? m.gap : 0);
        });

        // ─────────────────────────────────────────────────────────────────────────
        // MODE 3: MINIMAL CLEAN (Small, Crisp TV / Film Subtitles - Strictly Single Line)
        // ─────────────────────────────────────────────────────────────────────────
    } else {
        // Size the font on the FULL line (so it never jumps as words are
        // revealed), but only draw what has actually been SPOKEN — the old
        // whole-line render put unspoken words on screen early.
        const fullLine = words.join(' ');
        const visibleCount = Math.max(0, activeWordIndex + 1);
        if (visibleCount === 0) {
            ctx.restore();
            return;
        }
        const drawLine = words.slice(0, visibleCount).join(' ');
        // 0.65x weight-600 was "almost invisible" — read like real TV subs now.
        const minimalSize = Math.round(baseFontSize * 0.88);
        const maxAllowedWidth = width * (isPortrait ? 0.80 : 0.84);

        let activeSize = minimalSize;
        ctx.font = resolveFont(fontFamily, activeSize, '800');
        let fullWidth = ctx.measureText(fullLine).width;

        if (fullWidth > maxAllowedWidth) {
            activeSize = Math.max(16, Math.round(minimalSize * (maxAllowedWidth / fullWidth)));
            ctx.font = resolveFont(fontFamily, activeSize, '800');
            fullWidth = ctx.measureText(fullLine).width;
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const drawWidth = ctx.measureText(drawLine).width;
        const paddingX = Math.round(activeSize * 0.35);
        const pillWidth = drawWidth + paddingX * 2;
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
            ctx.strokeText(drawLine, width / 2, centerY);
        }

        ctx.fillStyle = pillBg === 'light' ? '#000000' : '#FFFFFF';
        ctx.fillText(drawLine, width / 2, centerY);
    }

    ctx.restore();
}

/**
 * Renders and exports the subtitle cues as a video file (Blob) through the
 * shared canvas-video-exporter — the exact same deterministic WebCodecs -> MP4
 * pipeline the text match cut, text highlighter and resizer studios use.
 * Frames are drawn on demand with exact per-frame timestamps (no wall-clock
 * capture stream), so exports are frame-exact and never play sped-up.
 *
 * NOTE: H.264 MP4 cannot carry an alpha channel, so a requested 'transparent'
 * background is flattened onto green — the chroma key editors apply anyway.
 * Browsers without WebCodecs fall back to the exporter's MediaRecorder path.
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
        delaySeconds = 0,
        onProgress,
    } = options;

    const resolvedMode = resolveVideoMode(videoMode, style);

    // Motion-as-code motion blur: sub-frames averaged per output frame.
    // Clamped to 1 (= off) through 8; only paid at export time, never in
    // the live preview loop.
    const motionBlurSamples = Math.max(1, Math.min(8, Math.round(typography.motionBlurSamples ?? 1)));

    // Load the real webfont BEFORE the first frame: canvas never waits
    // for fonts, so an export started too early ships the fallback face.
    await ensureOverlayFontReady(typography.fontFamily || 'Montserrat');

    const width = aspectRatio === '9:16' ? 1080 : 1920;
    const height = aspectRatio === '9:16' ? 1920 : 1080;

    // Both the WebCodecs MP4 path and the exporter's MediaRecorder fallback
    // render on an opaque canvas — flatten 'transparent' onto green so the
    // overlay stays chroma-keyable in every editor.
    const effectiveBackground: VideoBackgroundMode =
        background === 'transparent' ? 'green-screen' : background;

    const totalFrames = Math.max(1, Math.ceil(duration * fps));

    // ── Diagnostic probe ────────────────────────────────────────────────
    // Prove the renderer actually inks pixels with THESE args before we
    // encode anything. If a regression ever blanks the canvas, the console
    // says so immediately instead of shipping a mysterious empty mp4.
    try {
        const probeCanvas = document.createElement('canvas');
        probeCanvas.width = width;
        probeCanvas.height = height;
        const probeCtx = probeCanvas.getContext('2d', { alpha: false });
        if (probeCtx) {
            const firstCue = cues.find((c) => c.text && c.text.trim());
            const probeT = firstCue ? (firstCue.start + firstCue.end) / 2 : 0;
            drawCaptionFrame(
                probeCtx, width, height, probeT, cues,
                resolvedMode, effectiveBackground, highlighterColor, typography
            );
            const data = probeCtx.getImageData(0, 0, width, height).data;
            let inkSamples = 0; // pixels that differ from the green key
            for (let i = 0; i < data.length; i += 40) {
                if (data[i] + (255 - data[i + 1]) + data[i + 2] > 60) inkSamples++;
            }
            console.info(
                `[overlay-export] probe t=${probeT.toFixed(2)}s inkSamples=${inkSamples} ` +
                `cues=${cues.length} frames=${totalFrames} dur=${duration.toFixed(2)}s delay=${delaySeconds.toFixed(1)}s mode=${resolvedMode}`
            );
            if (inkSamples === 0) {
                console.warn(
                    `[overlay-export] probe warning: low ink detected at t=${probeT.toFixed(2)}s ` +
                    `(cues=${cues.length}). Proceeding with export render.`
                );
            }
        }
    } catch (err) {
        console.warn('[overlay-export] probe warning:', err);
    }

    // ── Plain-canvas blit + capture-safety cascade ─────────────────────
    // Each frame is drawn into a normal (non-desynchronized) scratch canvas
    // and blitted into the exporter's context, which is also asked for a
    // plain context — some GPU drivers rasterize low-latency desynchronized
    // canvases unreliably when detached, encoding blank frames.
    const attempt = async (w: number, h: number) => {
        const scratch = document.createElement('canvas');
        scratch.width = w;
        scratch.height = h;
        const scratchCtx = scratch.getContext('2d', { alpha: false });
        if (!scratchCtx) throw new Error('Could not create overlay scratch canvas.');

        const res = await exportCanvasVideoToMp4({
            width: w,
            height: h,
            fps,
            totalFrames,
            bitrate: 16_000_000, // 16 Mbps for razor-sharp typography
            audioBuffer: options.audioBuffer ?? null,
            desynchronized: false,
            renderFrame: (frameIndex, ctx) => {
                const frameTime = frameIndex / fps;
                // MOTION BLUR: average `motionBlurSamples` sub-frames
                // across the frame's exposure window (the blueprint's
                // Phase-5 accumulator, Δt = 1/(fps·samples)).
                if (motionBlurSamples > 1) {
                    accumulateMotionBlur(scratchCtx, frameTime, 1 / fps, motionBlurSamples, (subT) => {
                        drawCaptionFrame(
                            scratchCtx,
                            w,
                            h,
                            subT - delaySeconds,
                            cues,
                            resolvedMode,
                            effectiveBackground,
                            highlighterColor,
                            typography
                        );
                    });
                } else {
                    drawCaptionFrame(
                        scratchCtx,
                        w,
                        h,
                        frameTime - delaySeconds,
                        cues,
                        resolvedMode,
                        effectiveBackground,
                        highlighterColor,
                        typography
                    );
                }
                ctx.drawImage(scratch, 0, 0);
            },
            // Exporter reports 0..1; the UI progress bar expects 0..100.
            onProgress: (p) => onProgress?.(Math.min(100, Math.round(p * 100))),
        });
        return res;
    };

    let result = await attempt(width, height);

    if (result.usedFallback) {
        // Some drivers reject WebCodecs H.264 at full portrait resolution;
        // the exporter then silently records via MediaRecorder, which can
        // produce empty output on detached canvases. Retry once at a
        // 720-class size every hardware encoder accepts.
        const retryW = width > height ? 1280 : 720;
        const retryH = width > height ? 720 : 1280;
        console.warn(`[overlay-export] encoder fallback at ${width}x${height} — retrying at ${retryW}x${retryH}`);
        const second = await attempt(retryW, retryH);
        if (!second.usedFallback) {
            result = second;
        } else {
            console.error('[overlay-export] MediaRecorder fallback engaged even at 720p — export may be empty');
        }
    }

    console.info(
        `[overlay-export] done: ${(result.blob.size / 1048576).toFixed(2)}MB ` +
        `mime=${result.mimeType} fallback=${result.usedFallback} frames=${totalFrames} mbSamples=${motionBlurSamples}`
    );

    return result.blob;
}
