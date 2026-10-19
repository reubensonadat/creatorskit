// swatches.ts — §16 THE PHOTO PALETTE ENGINE.
//
// "Typography stamped on a photo looks like a sticker; typography set in
// the photo's OWN colours looks like it was printed with it." Three
// swatches are mined deterministically from the pixels — zero AI calls,
// zero hallucination — and the vision model's claimed swatches are
// validated against them (measured facts outrank the brief, same as
// geometry):
//
//   accentPrimary  the single most interesting SATURATED colour (the
//                  sneaker, the scarf, the neon) tuned to carry ink
//   paperNeutral   the lightest neutral surface (concrete, sky, studio
//                  paper) desaturated to a printable off-white
//   inkDark        the deepest shadow tone, desaturated to a rich
//                  near-black charcoal
//
// The same pixel pass yields the KEY LIGHT DIRECTION (the luminance
// centroid) the renderer uses to cast the sandwich's directional contact
// shadow and rim light — the two together are what make a text-behind
// cover read as a physical object photographed in a room.

// ---------------------------------------------------------------------------
// colour primitives
// ---------------------------------------------------------------------------

export type Rgb = readonly [number, number, number];

const clampCh = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

export const rgbToHex = (r: number, g: number, b: number): string =>
    `#${[r, g, b].map((v) => clampCh(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

export const hexToRgb = (hex: string): Rgb | null => {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const isHexColor = (v: unknown): v is string =>
    typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim());

/** Perceptual luminance on the 0-255 scale (Rec.601 — matches the field). */
export const lum255 = (r: number, g: number, b: number): number => 0.299 * r + 0.587 * g + 0.114 * b;

/** Mean channel distance between two colours (0-255 scale). */
const chanDist = (a: Rgb, b: Rgb): number =>
    (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3;

/** HSL saturation of an RGB triple (0-1). */
const satOf = (r: number, g: number, b: number): number => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max <= 0 ? 0 : (max - min) / max;
};

/** Push a colour toward its own neutral (gray of equal luminance). */
const desaturate = (rgb: Rgb, amount: number): Rgb => {
    const l = lum255(rgb[0], rgb[1], rgb[2]);
    return [rgb[0] + (l - rgb[0]) * amount, rgb[1] + (l - rgb[1]) * amount, rgb[2] + (l - rgb[2]) * amount];
};

/** Uniform-scale channels until luminance reaches the target (clamped). */
const retargetLum = (rgb: Rgb, target255: number): Rgb => {
    const l = lum255(rgb[0], rgb[1], rgb[2]);
    if (l < 1e-3) return [target255, target255, target255];
    const k = target255 / l;
    return [rgb[0] * k, rgb[1] * k, rgb[2] * k];
};

/** The brightest legible version of a tone (rim lights want ≥ 0.92 lum). */
export const brightenTo = (hex: string, targetLum = 235): string => {
    const rgb = hexToRgb(hex);
    if (!rgb) return '#FFFFFF';
    return lum255(rgb[0], rgb[1], rgb[2]) >= targetLum ? hex : rgbToHex(...retargetLum(rgb, targetLum));
};

/** `#RRGGBB` + alpha → an rgba() paint string (invalid hex → fallback). */
export const rgbaFromHex = (hex: string, alpha: number, fallback = '0, 0, 0'): string => {
    const rgb = hexToRgb(hex);
    return `rgba(${rgb ? `${rgb[0]}, ${rgb[1]}, ${rgb[2]}` : fallback}, ${Math.max(0, Math.min(1, alpha))})`;
};

// ---------------------------------------------------------------------------
// the swatch contract
// ---------------------------------------------------------------------------

export interface PhotoSwatches {
    /** ONE saturated hue actually present in the photo ('' when monochrome). */
    accentPrimary: string;
    /** The photo's own lightest surface, neutralized to a printable off-white. */
    paperNeutral: string;
    /** The photo's deepest shadow, neutralized to a rich near-black. */
    inkDark: string;
}

/** The key light direction (normalized, pointing FROM the frame centre
 *  TOWARD where the light comes from) + a flatness score. */
export interface LightAngle {
    dx: number;
    dy: number;
    /** 0 = perfectly even light (use the classic upper-left studio default). */
    strength: number;
}

/** Studio-default key light: upper-left, slightly steep. */
export const DEFAULT_LIGHT_ANGLE: LightAngle = { dx: -0.61, dy: -0.79, strength: 0 };

// ---------------------------------------------------------------------------
// the pixel pass
// ---------------------------------------------------------------------------

/** Downsample an image/canvas to a tiny working canvas for measurement.
 *  Returns null when the source is empty or the 2D context is denied. */
export const downsampleForSwatches = (src: CanvasImageSource, w = 96, h = 120): HTMLCanvasElement | null => {
    try {
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const ctx = off.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        ctx.drawImage(src, 0, 0, w, h);
        return off;
    } catch {
        return null;
    }
};

/**
 * Mine the three swatches from a (downsampled) canvas. Deterministic: the
 * same pixels always yield the same palette.
 *
 *   paperNeutral — mean of the brightest ~18% of pixels, heavily
 *                  neutralized (paper is paper, not a pastel) and lifted
 *                  to ≥ 0.90 luminance so unplated type still reads.
 *   inkDark      — mean of the darkest ~18%, neutralized harder and
 *                  pressed to ≤ 0.16 luminance (a rich charcoal, not a
 *                  pastel shadow).
 *   accentPrimary— the coarse colour bucket (4 bits/channel) that maxes
 *                  saturation × √frequency among buckets that are
 *                  saturated AND frequent enough to matter, retargeted
 *                  into the legible luminance band. '' when the photo is
 *                  genuinely monochrome — an invented accent is a lie.
 */
export const extractPhotoSwatches = (cv: HTMLCanvasElement): PhotoSwatches | null => {
    try {
        if (!cv.width || !cv.height) return null;
        // Defensive cap: never read more than a 128-wide working copy.
        let work = cv;
        if (cv.width > 128) {
            const w = 128;
            const h = Math.max(1, Math.round((cv.height / cv.width) * w));
            const off = downsampleForSwatches(cv, w, h);
            if (!off) return null;
            work = off;
        }
        const ctx = work.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        const d = ctx.getImageData(0, 0, work.width, work.height).data;
        const n = d.length / 4;
        if (!n) return null;

        // ── luminance percentile pools for the neutrals ──────────────────
        const px: Array<{ r: number; g: number; b: number; l: number }> = [];
        px.length = n;
        for (let i = 0, p = 0; i < d.length; i += 4, p++) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            px[p] = { r, g, b, l: lum255(r, g, b) };
        }
        px.sort((a, b) => a.l - b.l);

        const band = Math.max(8, Math.floor(n * 0.18));
        const meanBand = (from: number, to: number): Rgb => {
            let r = 0;
            let g = 0;
            let b = 0;
            const c = Math.max(1, to - from);
            for (let i = from; i < to; i++) {
                r += px[i].r;
                g += px[i].g;
                b += px[i].b;
            }
            return [r / c, g / c, b / c];
        };

        // paperNeutral — bright band, neutralized, lifted to ≥ 230/255.
        let paper = desaturate(meanBand(n - band, n), 0.55);
        if (lum255(paper[0], paper[1], paper[2]) < 230) paper = retargetLum(paper, 230);
        // inkDark — dark band, neutralized harder, pressed to ≤ 42/255.
        let ink = desaturate(meanBand(0, band), 0.65);
        if (lum255(ink[0], ink[1], ink[2]) > 42) ink = retargetLum(ink, 42);

        // ── the accent: coarse RGB histogram, saturation-weighted ────────
        const BUCKETS = 4096; // 4 bits per channel
        const bR = new Float64Array(BUCKETS);
        const bG = new Float64Array(BUCKETS);
        const bB = new Float64Array(BUCKETS);
        const bN = new Float64Array(BUCKETS);
        for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
            bR[k] += r;
            bG[k] += g;
            bB[k] += b;
            bN[k] += 1;
        }
        let bestScore = 0;
        let bestBucket = -1;
        const minFreq = n * 0.0035; // ≥ 0.35% of the frame — not a speck
        for (let k = 0; k < BUCKETS; k++) {
            const c = bN[k];
            if (c < minFreq) continue;
            const r = bR[k] / c;
            const g = bG[k] / c;
            const b = bB[k] / c;
            const sat = satOf(r, g, b);
            if (sat < 0.28) continue;
            const l = lum255(r, g, b);
            if (l < 30 || l > 218) continue; // must survive as ink ON something
            const score = sat * Math.sqrt(c / n);
            if (score > bestScore) {
                bestScore = score;
                bestBucket = k;
            }
        }
        let accentHex = '';
        if (bestBucket >= 0) {
            const c = bN[bestBucket];
            let a: Rgb = [bR[bestBucket] / c, bG[bestBucket] / c, bB[bestBucket] / c];
            const l = lum255(a[0], a[1], a[2]);
            if (l < 46) a = retargetLum(a, 56); // keep dark accents legible as type
            else if (l > 205) a = retargetLum(a, 188); // keep pale accents punchy
            accentHex = rgbToHex(a[0], a[1], a[2]);
        }

        return {
            accentPrimary: accentHex,
            paperNeutral: rgbToHex(paper[0], paper[1], paper[2]),
            inkDark: rgbToHex(ink[0], ink[1], ink[2]),
        };
    } catch {
        return null;
    }
};

/**
 * The key light direction from a (downsampled) canvas: the luminance
 * centroid relative to the frame centre tells us where the light lives.
 * Falls back to the classic upper-left studio key when the field is even.
 */
export const extractLightAngle = (cv: HTMLCanvasElement): LightAngle => {
    try {
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        if (!ctx || !cv.width || !cv.height) return DEFAULT_LIGHT_ANGLE;
        const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
        let sumL = 0;
        let sumX = 0;
        let sumY = 0;
        let maxL = 1e-6;
        for (let i = 0, p = 0; i < d.length; i += 4, p++) {
            const l = lum255(d[i], d[i + 1], d[i + 2]);
            const x = p % cv.width;
            const y = (p / cv.width) | 0;
            sumL += l;
            sumX += l * x;
            sumY += l * y;
            if (l > maxL) maxL = l;
        }
        if (sumL <= 0) return DEFAULT_LIGHT_ANGLE;
        const cx = sumX / sumL / cv.width - 0.5;
        const cy = sumY / sumL / cv.height - 0.5;
        const mag = Math.hypot(cx, cy);
        // An even field (centroid ≈ centre) has no opinion — studio default.
        if (mag < 0.02) return DEFAULT_LIGHT_ANGLE;
        return { dx: cx / mag, dy: cy / mag, strength: Math.min(1, mag / 0.25) };
    } catch {
        return DEFAULT_LIGHT_ANGLE;
    }
};

// ---------------------------------------------------------------------------
// the doctrine gate — measured facts outrank the AI's claims
// ---------------------------------------------------------------------------

const NEUTRAL_TOLERANCE = 96; // a claimed paper/ink must BE the photo's tone
const ACCENT_TOLERANCE = 132; // accents have latitude, but not imagination

/**
 * Reconcile the vision model's claimed swatches with the measured ones.
 * A valid AI hex survives only when it plausibly IS a colour in this
 * photo (channel distance against the measured swatch); otherwise the
 * measurement wins silently. No measurement + valid AI hexes → the AI's
 * palette (best effort). Nothing valid → null (the composer's stock
 * ink/paper stand).
 */
export const harmonizeAiSwatches = (
    ai: { accentPrimary?: unknown; paperNeutral?: unknown; inkDark?: unknown } | null | undefined,
    measured: PhotoSwatches | null,
): PhotoSwatches | null => {
    const aiHex = (v: unknown): string => (isHexColor(v) ? (v as string).trim().toUpperCase() : '');
    const aiAcc = aiHex(ai?.accentPrimary);
    const aiPaper = aiHex(ai?.paperNeutral);
    const aiInk = aiHex(ai?.inkDark);

    if (!measured) {
        const any = aiAcc || aiPaper || aiInk;
        return any ? { accentPrimary: aiAcc, paperNeutral: aiPaper || '#FFFFFF', inkDark: aiInk || '#0A0A0A' } : null;
    }

    const pick = (claim: string, truth: string, tol: number): string => {
        if (!claim) return truth;
        const c = hexToRgb(claim);
        const t = hexToRgb(truth);
        if (!c || !t) return truth;
        return chanDist(c, t) <= tol ? claim : truth;
    };

    return {
        accentPrimary: pick(aiAcc, measured.accentPrimary, ACCENT_TOLERANCE),
        paperNeutral: pick(aiPaper, measured.paperNeutral, NEUTRAL_TOLERANCE),
        inkDark: pick(aiInk, measured.inkDark, NEUTRAL_TOLERANCE),
    };
};
