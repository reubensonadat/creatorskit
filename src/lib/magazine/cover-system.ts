// ---------------------------------------------------------------------------
// THE MAGAZINE COVER SYSTEM — the component grammar as executable code.
//
// This module consolidates every device of newsstand cover design into ONE
// composer: masthead · dateline · feature coverline · sub-coverline ·
// TEASER STACK (3-6 secondary coverlines) · side rail · badge · legibility
// plate · banner strip · barcode/QR · bleed frame. It runs fully on-device
// (no AI key, no network) and produces layer specs that map 1:1 onto
// Text-Behind's TextLayer / ShapeLayer schema.
//
// The core law (from the 60-cover structural analysis):
//   A cover is a FIXED BRAND SYSTEM (masthead position + typeface + accent +
//   barcode corner) into which a VARIABLE COMPOSITION is dropped — and the
//   photograph dictates the composition, not the other way around. The
//   photo's negative-space scan (headroom / side columns / subject position)
//   is the variable that selects the template:
//
//     calm headroom   → TOP-MASTHEAD (classic over-head or sandwich behind)
//     calm side column→ SIDE-STRIP (masthead + coverline stack in the strip)
//     dense everywhere→ DEEP-LAYER (sandwich masthead, bottom strip,
//                        optional ink-on-paper STATEMENT over the body)
//     rare rolls      → VERTICAL (Position E side-rail masthead),
//                       INVERTED (Position F special-issue bottom masthead),
//                       BANNER (full-width strip carrying the feature line),
//                       SYMMETRIC (teasers split across both calm columns)
//
// Coverline column strategy (§5 of the analysis): left stack · right stack ·
// symmetric both-columns · asymmetric both-columns · bottom strip — chosen
// by which column the scan says is calm, teasers stepping hierarchy one
// rung at a time (weight → color → case), each 25-40% of the masthead.
//
// Other encoded laws: voice limits (each component speaks once), masthead
// ≥ 2.5× the coverline cap height, barcode corner OPPOSITE the text mass,
// contrast order plate > banner > badge > dim > filter > grain (never
// shadow), premium readability floors on every face.
import { ARCHETYPE_OF_STYLE } from './archetypes';
import type { PhotoSwatches } from './swatches';
import type { PhotoFilterId } from './types';

export type SystemStyleId =
    | 'vogue'
    | 'zine'
    | 'kinfolk'
    | 'noir'
    | 'gq'
    | 'dazed'
    | 'natgeo'
    | 'cyber'
    | 'vinyl'
    | 'architectural'
    | 'food'
    | 'fragments'
    | 'time'
    | 'eye'
    | 'bazaar';

export type SystemAutoStyle = SystemStyleId | 'auto';

// --- the zone system (yPct bands) ------------------------------------------

export const MAGAZINE_BANDS = {
    edge: [0.0, 0.05],
    dateline: [0.05, 0.12],
    masthead: [0.14, 0.36],
    subject: [0.35, 0.74],
    coverline: [0.76, 0.9],
    folio: [0.9, 0.97],
} as const;

// --- the component inventory (hierarchy weights & devices) ------------------

export const MAGAZINE_COMPONENTS = [
    { id: 'masthead', weight: 10, zone: 'masthead', device: 'sandwich (depth behind) or plated' },
    { id: 'dateline', weight: 3, zone: 'dateline', device: 'un-plated white on dim' },
    { id: 'coverline', weight: 7, zone: 'coverline', device: 'plated ink-on-paper when over subject' },
    { id: 'sub-coverline', weight: 4, zone: 'coverline', device: 'same treatment as parent, lighter' },
    { id: 'teaser-stack', weight: 2, zone: 'coverline', device: '3-6 micro teasers in the calm column' },
    { id: 'side-rail', weight: 2, zone: 'subject-edge', device: 'rotationDeg ±90 pinned to an edge' },
    { id: 'badge', weight: 3, zone: 'dateline/folio', device: 'plate + label atom' },
    { id: 'plate', weight: 0, zone: 'any', device: 'servant — always under its text' },
    { id: 'banner', weight: 5, zone: 'coverline', device: 'full-width special-issue strip' },
    { id: 'scan', weight: 1, zone: 'folio', device: 'real EAN-13 barcode or QR' },
    { id: 'frame', weight: 1, zone: 'edge', device: 'full-bleed border' },
] as const;

// --- spec types (map 1:1 onto the editor schema) ----------------------------

export interface SystemTextSpec {
    id: string;
    text: string;
    fontId: string;
    weight: number;
    italic?: boolean;
    caseMode: 'uppercase' | 'original';
    fitToWidth: boolean;
    widthPct: number;
    heightPct: number;
    letterSpacingEm: number;
    color: string;
    opacity: number;
    strokeEm?: number;
    strokeColor?: string;
    rotationDeg: number;
    depth: 'behind' | 'front';
    xPct: number;
    yPct: number;
}

export interface SystemShapeSpec {
    id: string;
    kind: 'rect' | 'badge' | 'barcode' | 'qr' | 'frame';
    xPct: number;
    yPct: number;
    wPct: number;
    hPct: number;
    fillColor: string;
    fillOn: boolean;
    strokeColor: string;
    strokeW: number;
    cornerPct: number;
    rotationDeg: number;
    opacity: number;
    depth: 'behind' | 'front';
    label?: string;
}

export interface ComposedCover {
    theme: string;
    style: SystemStyleId;
    archetype: string;
    text: SystemTextSpec[];
    shapes: SystemShapeSpec[];
    photo: {
        bgDim: number;
        dimWholePhoto: boolean;
        photoFilter: PhotoFilterId;
        grain: { enabled: boolean; opacity: number; size: number };
    };
}

// --- user content overrides ---------------------------------------------------

export interface SystemContentInput {
    masthead?: string;
    dateline?: string;
    rail?: string;
    feature?: string;
    sub?: string;
    teasers?: string[];
    badge?: string;
}

// ---------------------------------------------------------------------------
// PHOTO NEGATIVE-SPACE ANALYSIS — the variable that selects the template.
// Coarse quadrant scan of the rendered canvas: calmness = low texture
// variance (flat sky / wall / studio = calm), lightness decides plate pair.
// ---------------------------------------------------------------------------

export interface PhotoAnalysis {
    headroom: number; // 0-1 calmness of the top band (masthead may live there)
    leftSpace: number; // 0-1 calmness of the left column
    rightSpace: number; // 0-1 calmness of the right column
    bottomSpace: number; // 0-1 calmness of the bottom band
    photoLight: boolean; // overall luminance — picks ink/paper plate polarity
    subjectX: 'left' | 'center' | 'right'; // where the visual mass sits
    hue: number; // 0-360 dominant hue of the subject region (the colour vibe)
    sat: number; // 0-1 colourfulness of the subject region
    /** §7 POSE — a reclining/lying subject rotates the calm grammar: the
     *  body owns a horizontal band, so the calm zones are the TOP and
     *  BOTTOM bands, never the side columns. Measured, never guessed. */
    pose?: 'upright' | 'horizontal';
    /** Subject box size as canvas fractions (w, h) — the pose evidence. */
    subjectW?: number;
    subjectH?: number;
    /** Exact normalized bounding box of the cutout / subject mass. */
    subjectBox?: { x0: number; y0: number; x1: number; y1: number } | null;
}

/** Average RGB → hue (0-360°) + saturation (0-1) — the photo's colour mood. */
const rgbToHueSat = (r: number, g: number, b: number): { hue: number; sat: number } => {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    let hue = 0;
    if (d > 1e-4) {
        if (max === rn) hue = ((gn - bn) / d) % 6;
        else if (max === gn) hue = (bn - rn) / d + 2;
        else hue = (rn - gn) / d + 4;
        hue *= 60;
        if (hue < 0) hue += 360;
    }
    const sat = max <= 0 ? 0 : d / max;
    return { hue, sat };
};

export function analyzePhotoFromCanvas(cv: HTMLCanvasElement): PhotoAnalysis | null {
    try {
        const c = cv.getContext('2d', { willReadFrequently: true });
        if (!c) return null;
        const W = cv.width;
        const H = cv.height;
        if (!W || !H) return null;

        const region = (x0: number, y0: number, x1: number, y1: number): { calm: number; mean: number; r: number; g: number; b: number } => {
            const bx = Math.max(0, Math.floor(W * x0));
            const by = Math.max(0, Math.floor(H * y0));
            const bw = Math.max(1, Math.min(Math.floor(W * x1) - bx, W - bx));
            const bh = Math.max(1, Math.min(Math.floor(H * y1) - by, H - by));
            const d = c.getImageData(bx, by, bw, bh).data;
            let sum = 0;
            let n = 0;
            let rs = 0;
            let gs = 0;
            let bs = 0;
            const lums: number[] = [];
            for (let i = 0; i < d.length; i += 64) {
                const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                lums.push(l);
                sum += l;
                rs += d[i];
                gs += d[i + 1];
                bs += d[i + 2];
                n++;
            }
            if (!n) return { calm: 0.5, mean: 128, r: 128, g: 128, b: 128 };
            const mean = sum / n;
            let varAcc = 0;
            for (const l of lums) varAcc += (l - mean) * (l - mean);
            const sd = Math.sqrt(varAcc / n);
            // Flat texture (sd 0) = fully calm; busy texture (sd ≥ 70) = dense.
            const calm = Math.max(0, Math.min(1, 1 - sd / 70));
            return { calm, mean, r: rs / n, g: gs / n, b: bs / n };
        };

        const top = region(0, 0, 1, 0.18);
        const left = region(0, 0.18, 0.24, 0.72);
        const right = region(0.76, 0.18, 1, 0.72);
        const bottom = region(0, 0.74, 1, 0.94);
        const mid = region(0.24, 0.2, 0.76, 0.72);
        // The subject region's colour mood — this drives the VIBE MATCH pick.
        const vibe = rgbToHueSat(mid.r, mid.g, mid.b);

        const photoLight = top.mean * 0.3 + mid.mean * 0.7 > 150;

        let subjectX: PhotoAnalysis['subjectX'] = 'center';
        if (left.calm > right.calm + 0.08) subjectX = 'right'; // calm left ⇒ mass right
        else if (right.calm > left.calm + 0.08) subjectX = 'left';

        const r2 = (v: number) => Math.round(v * 100) / 100;
        // §7 pose heuristic (no subject box here — the band pattern speaks):
        // a reclining subject leaves BOTH horizontal bands relatively calm
        // while both side columns are busy. That pattern = horizontal pose.
        const horizontal = top.calm > 0.30 && bottom.calm > 0.30 && left.calm < 0.34 && right.calm < 0.34;
        return {
            headroom: r2(top.calm),
            leftSpace: r2(left.calm),
            rightSpace: r2(right.calm),
            bottomSpace: r2(bottom.calm),
            photoLight,
            subjectX,
            hue: Math.round(vibe.hue),
            sat: r2(vibe.sat),
            pose: horizontal ? 'horizontal' : 'upright',
        };
    } catch {
        return null;
    }
}

// --- seeded rng ---------------------------------------------------------------

const mulberry32 = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pickFrom = <T,>(rng: () => number, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

// --- premium copy pools -------------------------------------------------------

const CITIES = [
    'TOKYO — LONDON — SEOUL',
    'PARIS • MILAN • NEW YORK',
    'LONDON • BERLIN • SEOUL',
    'NEW YORK — PARIS — TOKYO',
    'OSLO — COPENHAGEN — KYOTO',
];

interface GenreConfig {
    label: string;
    theme: string;
    mastheadFont: { fontId: string; weight: number; tracking: number; widthPct: [number, number]; italic?: boolean; caseMode?: 'uppercase' | 'original' };
    microFont: { fontId: string; weight: number };
    voiceFont: { fontId: string; weight: number };
    mastheads: string[];
    dateline: string[]; // templates, {n} = issue no, {p} = price
    features: string[];
    subs: string[];
    teasers: string[]; // 3-6 micro teasers — the secondary coverline stack
    railTexts: string[];
    badges: string[];
    rail: 'left' | 'right' | 'none';
    scanCorner: 'left' | 'right';
    preferQr: boolean;
    frame?: { color: string; strokeW: number; opacity: number };
    accent?: string;
    grain: [number, number];
    bgDim: [number, number];
    dimWhole: boolean;
    filter: PhotoFilterId;
    kickerItalic?: boolean;
}

const GENRES: Record<SystemStyleId, GenreConfig> = {
    vogue: {
        label: 'HIGH FASHION',
        theme: 'Didone couture masthead over the subject',
        mastheadFont: { fontId: 'cinzel', weight: 700, tracking: 0.12, widthPct: [82, 90] },
        microFont: { fontId: 'inter', weight: 700 },
        voiceFont: { fontId: 'cinzel', weight: 700 },
        mastheads: ['SILLAGE', 'ATELIER', 'MAISON', 'COUTURE', 'EPOQUE', 'VOGUE'],
        dateline: ['PARIS • MILAN • NEW YORK  |  ISSUE {n} — €{p}', 'SPRING COUTURE  |  ISSUE {n} — €{p}'],
        features: ['THE NEW SILHOUETTE', 'SHAPE OF DESIRE', 'THE QUIET REVOLUTION'],
        subs: ['TAILORING IN THE AGE OF NOISE', 'PORTRAITS OF A SEASON — 84 PAGES'],
        teasers: ['THE WINTER EDIT', 'PLUS — 84 PAGES OF COUTURE', 'BEAUTY: THE NEW MINIMALISM', 'INSIDE: ATELIER DIARIES', 'EXCLUSIVE PORTFOLIO'],
        railTexts: ['COLLECTORS PRINT — SPRING COUTURE', 'PRINTED IN ITALY — EDITION {n}'],
        badges: ['COLLECTORS ISSUE', 'SPRING SPECIAL'],
        rail: 'none',
        scanCorner: 'right',
        preferQr: false,
        grain: [0.12, 2],
        bgDim: [0.14, 0.18],
        dimWhole: false,
        filter: 'none',
    },
    food: {
        label: 'FOOD BRAND',
        theme: 'Menu-card editorial — appetite serif on a cream plate',
        mastheadFont: { fontId: 'playfair', weight: 900, tracking: 0.1, widthPct: [80, 88] },
        microFont: { fontId: 'inter', weight: 700 },
        voiceFont: { fontId: 'lora', weight: 500 },
        mastheads: ['SUPPER', 'TABLE', 'SIZZLE', 'HARVEST', 'FEAST', 'LADLE', 'KITCHEN', 'GRAZE'],
        dateline: ['FRIDAY TABLE  |  MENU No. {n} — {c}', 'THE KITCHEN PASS  |  SERVICE {n} — {p} PLATES'],
        features: ['FRIDAY SPECIAL', 'FRESH OUT THE KITCHEN', 'TONIGHT WE FEAST', "THE WEEK'S BEST PLATE"],
        subs: ['cooked today, gone tomorrow', 'one table, everyone called', 'the recipe is patience'],
        teasers: ['FRIDAY DROP — 7PM', 'WHILE IT LASTS', 'KITCHEN NOTES — PAGE {p}', 'TAKE SOME HOME', 'SECONDS ENCOURAGED'],
        railTexts: ['OPEN FRIDAYS — BOOK THE BIG TABLE', 'COOKED SLOW — SERVED WARM'],
        badges: ['HOT PLATE', 'FRESH', 'SELLS OUT FAST'],
        rail: 'none',
        scanCorner: 'left',
        preferQr: false,
        frame: { color: '#F6EFE3', strokeW: 1.5, opacity: 0.85 },
        accent: '#E8590C',
        grain: [0.14, 2],
        bgDim: [0.12, 0.16],
        dimWhole: false,
        filter: 'vintage',
        kickerItalic: true,
    },
    zine: {
        label: 'INDIE ZINE',
        theme: 'Swiss 900-weight masthead with left spine rail',
        mastheadFont: { fontId: 'archivo', weight: 900, tracking: 0.0, widthPct: [84, 92] },
        microFont: { fontId: 'inter', weight: 700 },
        voiceFont: { fontId: 'inter', weight: 800 },
        mastheads: ['HAZE', 'STATIC', 'OFFCUT', 'PHOTOCOPY', 'RAG', 'MISPRINT'],
        dateline: ['INDEPENDENT PRINT  |  ISSUE {n} — {p} COPIES', 'SELF-PUBLISHED  |  EDITION {n} / 500'],
        features: ['SPECIAL PRINT ARCHIVE — {p} / 500 COPIES', 'DOCUMENTS FROM THE STREET'],
        subs: ['NO ADS — NO MASTERS — NO RETOUCHING', 'RISO-PRINTED IN TWO COLOURS'],
        teasers: ['PLUS — A FOLD-OUT POSTER', 'FIELD NOTES FROM THE STREET', 'RISO WORKSHOP SPECIAL', 'READERS PHOTOS — PAGE 42', 'NO ADS. EVER.'],
        railTexts: ['INDEPENDENT PRINT — ARCHIVE SERIES', 'PRINTED MATTER — COLLECTORS EDITION'],
        badges: ['SPECIAL ARCHIVE', 'HAND-NUMBERED EDITION'],
        rail: 'left',
        scanCorner: 'left',
        preferQr: true,
        grain: [0.27, 2],
        bgDim: [0.18, 0.24],
        dimWhole: true,
        filter: 'none',
    },
    kinfolk: {
        label: 'QUIET LUXURY',
        theme: 'Airy bone Didone inside an ivory bleed frame',
        mastheadFont: { fontId: 'cinzel', weight: 400, tracking: 0.15, widthPct: [76, 84] },
        microFont: { fontId: 'inter', weight: 700 },
        voiceFont: { fontId: 'playfair', weight: 700 },
        mastheads: ['SLOW', 'SEASONS', 'ALMANAC', 'HEARTH', 'STILL', 'GATHER'],
        dateline: ['VOLUME {n} · A STUDY ON LEISURE · {c}', 'THE SLOW LIVING ISSUE · No. {n} · {c}'],
        features: ['The Architecture of Silence', 'In Praise of Empty Rooms', 'A Season Unhurried'],
        subs: ['NOTES ON LIGHT, LINEN & TIME', 'SIXTY-FOUR PAGES OF QUIET'],
        teasers: ['Notes on Slow Mornings', 'A Study in Linen', 'The Quiet Kitchen', 'On Gathering Tables', 'Sixty-Four Pages of Light'],
        railTexts: ['QUARTERLY — PRINTED ON RECYCLED STOCK', 'A JOURNAL OF SLOW LIVING'],
        badges: ['VOLUME XIV', 'QUARTERLY'],
        rail: 'none',
        scanCorner: 'right',
        preferQr: false,
        frame: { color: '#F7F6F0', strokeW: 1.5, opacity: 0.85 },
        grain: [0.16, 2],
        bgDim: [0.12, 0.16],
        dimWhole: false,
        filter: 'vintage',
        kickerItalic: true,
    },
    noir: {
        label: '35MM NOIR',
        theme: 'Cinema archive masthead under heavy film grain',
        mastheadFont: { fontId: 'playfair', weight: 900, tracking: 0.12, widthPct: [84, 90] },
        microFont: { fontId: 'inter', weight: 700 },
        voiceFont: { fontId: 'inter', weight: 800 },
        mastheads: ['HALIDE', 'SILVER', 'FRAME', 'NIGHTFALL', 'EXPOSURE'],
        dateline: ['MOTION PICTURE ARCHIVE  |  ISSUE {n} — 35MM', 'REEL {n} — RESTORED FROM NITRATE'],
        features: ['ORIGINAL MOTION PICTURE — 35MM ARCHIVE', 'A FILM NOIR IN TWELVE FRAMES'],
        subs: ['SOUNDTRACK AVAILABLE ON VINYL', 'PRESENTED IN ITS ORIGINAL ASPECT RATIO'],
        teasers: ['SOUNDTRACK — SIDE B', "THE DIRECTOR'S CUT", 'RESTORED IN 4K', 'A REEL FROM THE ARCHIVE', 'MIDNIGHT LISTINGS'],
        railTexts: ['ARCHIVE PRINT — DEVELOPED BY HAND', 'MOTION PICTURE ARCHIVE — EST. 1948'],
        badges: ['LIMITED ARCHIVE • 35MM', 'REEL No. {n}'],
        rail: 'none',
        scanCorner: 'right',
        preferQr: false,
        grain: [0.38, 3],
        bgDim: [0.26, 0.32],
        dimWhole: true,
        filter: 'noir',
    },
    gq: {
        label: 'GQ / GENTLEMAN',
        theme: 'Condensed sans masthead with one gold accent',
        mastheadFont: { fontId: 'bebas-neue', weight: 400, tracking: 0.08, widthPct: [84, 90] },
        microFont: { fontId: 'inter', weight: 700 },
        voiceFont: { fontId: 'inter', weight: 800 },
        mastheads: ['GENTRY', 'STANDARD', 'UPTOWN', 'MERIDIAN', 'BOLT'],
        dateline: ['GLOBAL MEN OF THE YEAR  |  N° {n} — ${p}', 'STYLE · CULTURE · CONDUCT  |  ISSUE {n}'],
        features: ['MEN OF THE YEAR', 'THE SHARPENED SUIT', 'LATE NIGHT PROTOCOL'],
        subs: ['GROOMING, GRIT & TAILORING — 96 PAGES', 'THE WINTER EDIT'],
        teasers: ['THE WINTER EDIT', 'GROOMING — SHARP & SHORT', '48 PAGES OF TAILORING', 'THE WATCH GUIDE', 'LATE NIGHT, DONE RIGHT'],
        railTexts: ['PUBLISHED MONTHLY — LONDON — NEW YORK', 'THE GENTLEMANS JOURNAL — ISSUE {n}'],
        badges: ['SPECIAL DOUBLE ISSUE', 'MEN OF THE YEAR'],
        rail: 'none',
        scanCorner: 'right',
        preferQr: false,
        accent: '#D4AF37',
        grain: [0.14, 2],
        bgDim: [0.16, 0.2],
        dimWhole: false,
        filter: 'none',
    },
    dazed: {
        label: 'DAZED / CULTURE',
        theme: 'Art-school masthead with right spine rail',
        mastheadFont: { fontId: 'syne', weight: 800, tracking: 0.04, widthPct: [84, 90] },
        microFont: { fontId: 'space-mono', weight: 700 },
        voiceFont: { fontId: 'inter', weight: 800 },
        mastheads: ['FRACTURE', 'STATIC', 'YOUTH', 'MUTATE', 'RAW'],
        dateline: ['LONDON • BERLIN • SEOUL  |  ISSUE {n}', 'CULTURE DOSSIER  |  ISSUE {n} — £{p}'],
        features: ['THE FRACTURED SEASON', 'NOTHING IS ORIGINAL ANYMORE', 'A DOSSIER ON FEELING'],
        subs: ['MUSIC — STYLE — DISSONANCE', 'INSIDE: THE NEW UNDERGROUND'],
        teasers: ['MUSIC — THE NEW UNDERGROUND', 'STYLE IN 4 MOVEMENTS', 'THE DISSONANCE ISSUE', 'PLUS: A FOLD-OUT POSTER', 'READERS SUBMISSIONS OPEN'],
        railTexts: ['MONTHLY CULTURE DOSSIER — PRINTED IN LONDON', 'YOUTH MODE — COLLECT ALL ISSUES'],
        badges: ['RAW CUT // 2026', 'UNCORRECTED PROOF'],
        rail: 'right',
        scanCorner: 'left',
        preferQr: true,
        grain: [0.32, 2],
        bgDim: [0.2, 0.26],
        dimWhole: true,
        filter: 'none',
    },
    natgeo: {
        label: 'DISCOVERY',
        theme: 'Explorer masthead inside the archival gold frame',
        mastheadFont: { fontId: 'playfair', weight: 700, tracking: 0.12, widthPct: [80, 86] },
        microFont: { fontId: 'inter', weight: 700 },
        voiceFont: { fontId: 'cinzel', weight: 700 },
        mastheads: ['ATLAS', 'TERRA', 'EXPEDITION', 'BASIN', 'MERIDIAN'],
        dateline: ['EXPEDITION ARCHIVE • VOL. {n} • LAT 35°N', 'FIELD REPORT • VOL. {n} • {c}'],
        features: ['THE UNCHARTED TERRITORIES', 'WHERE THE MAP ENDS', 'THE LAST QUIET PLACES'],
        subs: ['FIELD NOTES FROM THE EDGE', 'PORTFOLIO — 48 PAGES OF WILD'],
        teasers: ['FIELD NOTES — 48 PAGES', 'THE MAP ROOM', 'PORTFOLIO: WILD PLACES', 'PLUS — A FOLD-OUT MAP', 'LAT 35°N / LONG 135°E'],
        railTexts: ['EXPLORATION ARCHIVE — EST. 1988', 'FIELD EDITION — PRINTED AT BASE CAMP'],
        badges: ['FIELD EDITION', 'VOL. {n}'],
        rail: 'none',
        scanCorner: 'right',
        preferQr: true,
        frame: { color: '#D4AF37', strokeW: 1.5, opacity: 0.85 },
        accent: '#D4AF37',
        grain: [0.16, 2],
        bgDim: [0.14, 0.18],
        dimWhole: false,
        filter: 'none',
    },
    cyber: {
        label: 'CYBER / MATRIX',
        theme: 'Terminal-stamped masthead, green protocol metadata',
        mastheadFont: { fontId: 'space-mono', weight: 700, tracking: 0.08, widthPct: [84, 90] },
        microFont: { fontId: 'space-mono', weight: 700 },
        voiceFont: { fontId: 'space-mono', weight: 700 },
        mastheads: ['NODE', 'SIGNAL', 'VANTA', 'GRID', 'PROTOCOL'],
        dateline: ['NODE://0092.44 • PROTOCOL 0.8 • ONLINE', 'SYS.ANALYSIS • ISSUE {n} • ENCRYPTED'],
        features: ['NEURAL INTERFACE // SPECIFICATION 04', 'THE MACHINE THAT DREAMS IN PRINT'],
        subs: ['FULL DOSSIER — 12 SECTORS', 'DECRYPT THE COVER — SCAN BELOW'],
        teasers: ['FULL DOSSIER — 12 SECTORS', 'SIGNAL LOG 0092', 'DECRYPT — SCAN THE COVER', 'HARDWARE REVIEWS', 'PROTOCOL 0.8 ACTIVE'],
        railTexts: ['TRANSMISSION LOG — DO NOT REDISTRIBUTE', 'SIGNAL ARCHIVE — NODE 0092'],
        badges: ['DECLASSIFIED', 'SYS-849201-X99'],
        rail: 'none',
        scanCorner: 'right',
        preferQr: true,
        accent: '#00FF88',
        grain: [0.29, 2],
        bgDim: [0.22, 0.28],
        dimWhole: true,
        filter: 'mono',
    },
    vinyl: {
        label: 'INDIE VINYL',
        theme: 'Record-sleeve script masthead with stereo stamp',
        mastheadFont: { fontId: 'caveat', weight: 700, tracking: 0.05, widthPct: [74, 84], caseMode: 'original' },
        microFont: { fontId: 'inter', weight: 700 },
        voiceFont: { fontId: 'inter', weight: 800 },
        mastheads: ['Groovebox', 'Side Streets', 'Reverb', 'Slow Rotate', 'Night Static'],
        dateline: ['LONG-PLAY MICROGROOVE  |  REC. {n} — 33⅓ RPM', 'FIRST PRESSING  |  CAT. No. {n}'],
        features: ['ORIGINAL STUDIO RECORDING', 'SIDE A / TRACK 01', 'RECORDED LIVE TO TAPE'],
        subs: ['FULL FREQUENCY RANGE RECORDING', '180-GRAM PRESSING — LIMITED {p}'],
        teasers: ['SIDE B — SLOWER CUTS', 'LINER NOTES INSIDE', '180-GRAM PRESSING', 'MASTERED FROM TAPE', 'LIMITED FIRST PRESSING'],
        railTexts: ['STEREO — 33⅓ RPM — SIDE A', 'AUDIOPHILE PRESSING — DIRECT FROM MASTER'],
        badges: ['STEREO • 33⅓ RPM', 'FIRST PRESSING'],
        rail: 'none',
        scanCorner: 'right',
        preferQr: false,
        grain: [0.15, 2],
        bgDim: [0.16, 0.2],
        dimWhole: false,
        filter: 'vintage',
    },
    architectural: {
        label: 'ARCHITECTURE',
        theme: 'Rational Bodoni monograph on a strict grid',
        mastheadFont: { fontId: 'bodoni', weight: 700, tracking: 0.1, widthPct: [80, 88] },
        microFont: { fontId: 'inter', weight: 600 },
        voiceFont: { fontId: 'inter', weight: 600 },
        mastheads: ['FORM', 'AXIS', 'VAULT', 'ORTHO', 'STRUCTURE'],
        dateline: ['MONOGRAPH N° {n} — STRUCTURES OF LIGHT', 'QUARTERLY REVIEW OF BUILT FORM — {n}'],
        features: ['STRUCTURES OF LIGHT', 'CONCRETE, SILENCE, SPAN', 'THE POETICS OF LOAD'],
        subs: ['DRAWINGS, MODELS & DETAIL PLATES', 'SURVEY OF FOUR BUILDINGS'],
        teasers: ['DETAIL PLATES — 12 DRAWINGS', 'THE LOAD-BEARING ISSUE', 'SURVEY: FOUR BUILDINGS', 'ON LIGHT & SPAN', 'MODEL STUDIES'],
        railTexts: ['MONOGRAPH SERIES — PRINTED IN ZÜRICH', 'THE BUILT ENVIRONMENT — QUARTERLY'],
        badges: ['MONOGRAPH N° {n}', 'SURVEY EDITION'],
        rail: 'none',
        scanCorner: 'right',
        preferQr: false,
        frame: { color: '#FFFFFF', strokeW: 2, opacity: 0.9 },
        grain: [0.12, 2],
        bgDim: [0.14, 0.2],
        dimWhole: false,
        filter: 'none',
    },
    fragments: {
        label: 'HUMAN FRAGMENTS',
        theme: 'Giant typography integrated with subject + vertical rail',
        mastheadFont: { fontId: 'inter', weight: 900, tracking: -0.04, widthPct: [88, 96] },
        microFont: { fontId: 'space-mono', weight: 700 },
        voiceFont: { fontId: 'inter', weight: 800 },
        mastheads: ['FRAGMENTS', 'ARCHIVE', 'PASSAGE', 'ELEMENT', 'MONOLITH'],
        dateline: ['EDITORIAL POSTER  |  SERIES {n} — ARCHIVAL MONOGRAPH', 'SWISS CHRONICLE  |  FOLIO {n}'],
        features: ['THE HUMAN ARCHIVE', 'ANATOMY OF MOVEMENT', 'CONCRETE MEMORY'],
        subs: ['a study in urban presence and fractured space', 'light, posture, and silent architecture'],
        teasers: ['01 / SPATIAL DYNAMICS', '02 / TEMPORAL TRACE', '03 / SYSTEM OVERVIEW'],
        railTexts: ['POSTER SERIES — DESIGN RESEARCH', 'EDITION {n} — PRINTED ON ARCHIVAL STOCK'],
        badges: ['FOLIO EDITION', 'SWISS GRID'],
        rail: 'right',
        scanCorner: 'right',
        preferQr: false,
        grain: [0.08, 1],
        bgDim: [0.05, 0.1],
        dimWhole: false,
        filter: 'none',
    },
    time: {
        label: 'TIME',
        theme: 'Iconic red border with bold Person of the Year serif typography',
        mastheadFont: { fontId: 'playfair', weight: 900, tracking: 0.04, widthPct: [78, 86] },
        microFont: { fontId: 'inter', weight: 700 },
        voiceFont: { fontId: 'playfair', weight: 800 },
        mastheads: ['TIME', 'ERA', 'CENTURY', 'CHRONICLE'],
        dateline: ['PERSON OF THE YEAR  |  SPECIAL ISSUE', 'ANNUAL RETROSPECTIVE  |  VOL. {n}'],
        features: ['PERSON OF THE YEAR', 'THE ARCHITECTS OF TOMORROW', 'VOICES THAT CHANGED THE WORLD'],
        subs: ['an unprecedented global account', 'inside the decisions that shaped the century'],
        teasers: ['SPECIAL REPORT', 'THE 100 MOST INFLUENTIAL', 'GLOBAL VOICES'],
        railTexts: ['SPECIAL COMMEMORATIVE EDITION', 'TIME ARCHIVE — NEW YORK'],
        badges: ['PERSON OF THE YEAR', 'SPECIAL ISSUE'],
        rail: 'none',
        scanCorner: 'right',
        preferQr: false,
        frame: { color: '#E10600', strokeW: 4, opacity: 1.0 },
        accent: '#E10600',
        grain: [0.1, 1],
        bgDim: [0.1, 0.15],
        dimWhole: false,
        filter: 'none',
    },
    eye: {
        label: 'EYE',
        theme: 'Radical brutalist international graphic design review',
        mastheadFont: { fontId: 'syne', weight: 800, tracking: -0.05, widthPct: [85, 94] },
        microFont: { fontId: 'space-mono', weight: 700 },
        voiceFont: { fontId: 'syne', weight: 800 },
        mastheads: ['EYE', 'GRAPHIK', 'TYPO', 'MATRIX'],
        dateline: ['INTERNATIONAL REVIEW OF GRAPHIC DESIGN  |  No. {n}', 'CRITICAL VISUAL STUDIES  |  VOL. {n}'],
        features: ['RADICAL FORM', 'SYSTEMS OF LEGIBILITY', 'DISMANTLING THE GRID'],
        subs: ['essays on contemporary typography and culture', 'the politics of graphic artifacts'],
        teasers: ['ESSAYS & CRITICISM', 'TYPE SPECIMEN NO. 14', 'ARCHIVE SURVEY'],
        railTexts: ['EYE MAGAZINE — LONDON', 'QUARTERLY REVIEW'],
        badges: ['CRITICAL REVIEW', 'ISSUE {n}'],
        rail: 'none',
        scanCorner: 'right',
        preferQr: false,
        accent: '#FF0000',
        grain: [0.12, 1],
        bgDim: [0.08, 0.12],
        dimWhole: false,
        filter: 'mono',
    },
    bazaar: {
        label: 'BAZAAR',
        theme: "Soft editorial Didone elegance with behind-subject typography",
        mastheadFont: { fontId: 'cinzel', weight: 700, tracking: -0.02, widthPct: [84, 92] },
        microFont: { fontId: 'inter', weight: 600 },
        voiceFont: { fontId: 'cinzel', weight: 700 },
        mastheads: ['BAZAAR', 'ALLURE', 'LUMIERE', 'ELEGANCE'],
        dateline: ['PARIS • NEW YORK • MILAN  |  THE FASHION ISSUE', 'SPRING COUTURE REPORT  |  VOL. {n}'],
        features: ['THE ART OF STILLNESS', 'PURE COUTURE', 'THE MODERN MUSE'],
        subs: ['a season of rare poise and fluid silhouettes', 'tales from the couture workshops'],
        teasers: ['SPRING REPORT', 'BEAUTY PORTFOLIO', 'THE NEW PALETTE'],
        railTexts: ['SPECIAL FASHION FOLIO', 'PRINTED IN PARIS'],
        badges: ['EXCLUSIVE', 'THE FASHION ISSUE'],
        rail: 'none',
        scanCorner: 'right',
        preferQr: false,
        grain: [0.1, 1],
        bgDim: [0.1, 0.15],
        dimWhole: false,
        filter: 'none',
    },
};

const AUTO_PICKS: SystemStyleId[] = [
    'vogue', 'zine', 'kinfolk', 'noir', 'gq', 'dazed', 'natgeo', 'cyber', 'vinyl', 'architectural', 'food',
    'fragments', 'time', 'eye', 'bazaar',
];

/** Semantic genre matcher — maps freeform natural language genre descriptions
 *  (e.g. from vision models) to the closest design-system SystemStyleId. */
export function matchGenreToStyle(raw?: string | null): SystemStyleId | null {
    if (!raw) return null;
    const s = raw.toLowerCase().trim();
    if (!s || s === 'auto') return null;

    if ((AUTO_PICKS as readonly string[]).includes(s)) return s as SystemStyleId;

    // Specific media & culture (check high-specificity keywords first):
    if (/vinyl|record|album|audio|soundtrack|\bsong\b|acoustic|jazz/.test(s)) return 'vinyl';
    if (/skate|action|sport|street|subculture|counter|raw|underground|grunge|punk|rebel|zine/.test(s)) return 'zine';
    if (/brutalist|architect|concrete|structure|facade|geometry|monument|sculptur|urban|\bspace\b|spatial/.test(s)) return 'architectural';
    if (/food|culinary|recipe|appetite|\bdish\b|chef|kitchen|bakery|dining|restaurant/.test(s)) return 'food';
    if (/fashion|couture|runway|vogue|glamour|haute|model|editorial|chic|luxury/.test(s)) return 'vogue';
    if (/bazaar|elegance|sophisticat|soft|didone|poise|beauty/.test(s)) return 'bazaar';
    if (/gentleman|tailor|suit|menswear|classic|sharp|gq/.test(s)) return 'gq';
    if (/minimal|kinfolk|slow|linen|quiet|scandi|interior|warm|calm|zen|earth|ceramic/.test(s)) return 'kinfolk';
    if (/noir|shadow|dark|cinema|film|detective|moody|chiaroscuro|monochrome|grain/.test(s)) return 'noir';
    if (/natgeo|discovery|wild|nature|adventure|travel|expedition|geograph|mountain|ocean/.test(s)) return 'natgeo';
    if (/cyber|matrix|digital|tech|future|\bai\b|glitch|hacker|sci-fi|terminal|neon|data/.test(s)) return 'cyber';
    if (/time|history|report|person|news|monumental|investigat|commemorat/.test(s)) return 'time';
    if (/eye|graphic|swiss|poster|typography|helvetica|grid/.test(s)) return 'eye';
    if (/fragment|collage|modernist|abstract|deconstruct/.test(s)) return 'fragments';
    if (/dazed|youth|experimental|provocative|avant-garde|club|\balt\b|queer|\briot\b|indie/.test(s)) return 'dazed';

    return null;
}

/** VIBE MATCH — the genre whose aesthetic fits the photo's measured colour
 *  mood wins: warm & saturated → FOOD appetite brand, gold light → couture,
 *  green/natural → quiet living or record sleeve, washed-out light →
 *  KINFOLK, washed-out dark → NOIR, cool blue → discovery/terminal,
 *  violet → culture. Deterministic: same photo, same aesthetic answer. */
const vibePick = (a: PhotoAnalysis): SystemStyleId => {
    const { hue, sat, photoLight } = a;
    // Very desaturated (monochrome) → quiet genres only
    if (sat < 0.12) return photoLight ? 'kinfolk' : 'noir';
    // Warm golden/amber — clear editorial warmth
    const warm = hue >= 340 || (hue >= 12 && hue <= 50);
    if (warm && sat >= 0.34) return 'food';
    if (hue > 50 && hue < 70 && sat >= 0.4) return 'vogue';
    // Green/yellow-green: kinfolk only if very soft (low sat + light),
    // otherwise zine (street editorial) or vinyl (music/culture).
    if (hue >= 70 && hue < 160) {
        if (sat < 0.22 && photoLight) return 'kinfolk';
        return photoLight ? 'zine' : 'vinyl';
    }
    // Teal / cyan / blue-green — action, street, architecture → zine or gq
    if (hue >= 160 && hue < 210) return photoLight ? 'zine' : 'gq';
    // Blue / cool → natgeo (light), or cyber ONLY if high saturation neon/digital (sat >= 0.5), otherwise architectural or noir
    if (hue >= 210 && hue < 265) {
        if (photoLight) return 'natgeo';
        return sat >= 0.5 ? 'cyber' : 'architectural';
    }
    // Violet / purple → dazed culture
    if (hue >= 265 && hue < 340 && sat >= 0.25) return 'dazed';
    // Fallback: prefer bold genres over quiet ones
    return photoLight ? 'gq' : 'noir';
};

const fill = (rng: () => number, tpl: string): string => {
    const issue = String(Math.floor(rng() * 88) + 12);
    const price = String(Math.floor(rng() * 16) + 4);
    return tpl.replace(/\{n\}/g, issue).replace(/\{p\}/g, price).replace(/\{c\}/g, pickFrom(rng, CITIES));
};

const shuffled = <T,>(rng: () => number, arr: readonly T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

// --- the type ladder's arithmetic (§4 — hierarchy you can measure) ---------
// The renderer draws fitToWidth:false text at font px = H × heightPct/100
// (then clamps its width to 90% W), and fitToWidth:true text stretched to
// widthPct. These helpers pick sizes that LAND where the stance wants them:
// the feature reads poster-scale on short words without clipping on long
// ones, and micro lines never balloon fat on short ones. Portrait r = W/H
// ≈ 0.72 is assumed; the clamps absorb whatever ratio the photo brings.
const R_PORTRAIT = 0.72;
const clamp01Len = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round002 = (v: number) => Math.round(v * 100) / 100;
/** Auto cap-height (pct of H) so `maxLen` glyphs land near `targetWPct`
 *  of canvas WIDTH. The page's measureTextBox models the portrait aspect
 *  (×1.5 H/W): a font at h% of height paints a line ≈ maxLen × h × 1.5 ×
 *  adv % of width. The model MUST match here or fonts come out ~1.3× too
 *  large for their column and long lines overflow the edge — the bug
 *  that broke the first AI-directed editions. adv 0.8 ≈ uppercase+track. */
const capHeightForLine = (maxLen: number, targetWPct: number, minH: number, maxH: number): number =>
    round002(clamp01Len(targetWPct / (Math.max(4, maxLen) * 1.5 * 0.8), minH, maxH));
/** Length-aware width (pct of W) for a fitToWidth micro line, so its
 *  rendered cap height lands near `targetH` pct of H instead of ballooning
 *  on short text. (maxLen × h × 0.92 ≈ maxLen × h × 1.5 × 0.62 — the
 *  aspect model already lives inside the 0.92.) */
const microWidthForLine = (maxLen: number, targetH: number): number =>
    Math.round(clamp01Len(Math.max(4, maxLen) * targetH * 0.92, 34, 88));
/** EXACTLY the page guarantee's width estimate (measureTextBox): same
 *  aspect (×1.5), same advance model (0.76/0.68 + tracking×1.05), same
 *  slack — authored plates land hugging their words and reCutPlates
 *  finds nothing to re-cut. */
const measureW = (maxLen: number, hPct: number, trackEm: number, uppercase: boolean): number =>
    Math.min(96, maxLen * hPct * 1.5 * ((uppercase ? 0.76 : 0.68) + Math.max(0, trackEm) * 1.05) + hPct * 0.75);
const SHORT_CONNECTORS = new Set(['a', 'an', 'the', 'in', 'on', 'of', 'for', 'to', 'at', 'by', 'with', 'and', 'or', 'is', 'as', 'de', 'la', 'le', 'du']);

/** Greedy word-wrap with last-line balancing & widow prevention — how a
 *  print desk sets a slab: the column owns the width, the words wrap to the column. */
const wrapLine = (text: string, maxChars: number): string[] => {
    const clean = text.replace(/\s+/g, ' ').trim();
    const words = clean.split(' ').filter(Boolean);
    if (words.length <= 1) return [clean];
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
        const cand = cur ? `${cur} ${w}` : w;
        if (cand.length > maxChars && cur) {
            lines.push(cur);
            cur = w;
        } else {
            cur = cand;
        }
    }
    if (cur) lines.push(cur);

    // Editorial Polish Pass 1: Prevent stranded dangling prepositions at line ends
    for (let i = 0; i < lines.length - 1; i++) {
        const lineWords = lines[i].split(' ');
        if (lineWords.length > 1) {
            const lastWord = lineWords[lineWords.length - 1].toLowerCase();
            if (SHORT_CONNECTORS.has(lastWord) && lastWord.length <= 4) {
                const moved = lineWords.pop()!;
                lines[i] = lineWords.join(' ');
                lines[i + 1] = `${moved} ${lines[i + 1]}`;
            }
        }
    }

    // Editorial Polish Pass 2: Rag & Widow balancing
    if (lines.length >= 2) {
        for (let pass = 0; pass < 3; pass++) {
            const last = lines.length - 1;
            const lastLineWords = lines[last].split(' ');
            if (lastLineWords.length === 1 || lines[last].length < lines[last - 1].length * 0.50) {
                const prevWords = lines[last - 1].split(' ');
                if (prevWords.length > 1) {
                    const moved = prevWords.pop()!;
                    lines[last - 1] = prevWords.join(' ');
                    lines[last] = `${moved} ${lines[last]}`;
                    if (lines[last].length > maxChars + 5) {
                        lines[last - 1] = `${lines[last - 1]} ${moved}`;
                        lines[last] = lines[last].slice(moved.length + 1);
                        break;
                    }
                }
            }
        }
    }
    return lines.filter(Boolean);
};
/** Pick the wrapped line count whose LONGEST line fits the column at a
 *  dignified size — 1 line when the words are short, 2-3 balanced lines
 *  when they are long. A k-line wrap only counts when its longest line
 *  is wide enough at nearly-minimum size (raw ≥ 0.9×minH); if none
 *  qualifies, the maxLines wrap stands at its honest clamped size. This
 *  is what makes a 34-character AI coverline a composed slab instead of
 *  an edge-overflowing worm. */
const layoutForColumn = (raw: string, colWPct: number, minH: number, maxH: number, maxLines: number) => {
    const clean = raw.replace(/\s+/g, ' ').trim();
    const clampH = (v: number) => round002(clamp01Len(v, minH, maxH));
    // Fallback of last resort: the maxLines wrap, whatever it measures.
    const perMax = Math.max(8, Math.ceil(clean.length / maxLines) + 2);
    const linesMax = wrapLine(clean, perMax);
    const maxLenMax = Math.max(4, ...linesMax.map((l) => l.length));
    let best = {
        text: linesMax.join('\n'),
        h: clampH(colWPct / (maxLenMax * 1.2)),
        maxLen: maxLenMax,
        lines: linesMax.length,
    };
    for (let k = 1; k <= maxLines; k++) {
        const per = Math.max(8, Math.ceil(clean.length / k) + 2);
        const lines = wrapLine(clean, per);
        if (lines.length > k) continue;
        const maxLen = Math.max(4, ...lines.map((l) => l.length));
        const rawH = colWPct / (maxLen * 1.2);
        if (rawH >= minH * 0.9) {
            // Fewest lines that fit at a dignified size — take it.
            best = { text: lines.join('\n'), h: clampH(rawH), maxLen, lines: lines.length };
            break;
        }
    }
    return best;
};

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// THE LAYOUT POOL — 50 hidden structural presets (the grounding library).
// Masthead positions A-F × column strategies §5.1-5.6 × special-issue
// variants. ASSEMBLE cycles them; the AI is offered the id menu. Copy is
// never fixed here — only WHERE things sit. The photo's measured calm
// zones still veto unsafe geometry at compose time, and the layout laws
// guarantee nothing overlaps once it lands on the canvas.
// ---------------------------------------------------------------------------

export interface LibraryLayout {
    id: string;
    name: string;
    template: 'TOP-MASTHEAD' | 'SIDE-STRIP' | 'DEEP-LAYER' | 'VERTICAL' | 'INVERTED';
    mhX: number;
    mhY: number;
    mhWidth: number;
    cluster: 'left' | 'right' | 'center' | 'split';
    variant: 'classic' | 'banner' | 'statement' | 'symmetric';
    micro: 'rail' | 'dateline';
}

export const LAYOUT_LIBRARY: LibraryLayout[] = [
    // -- A · Position A: top-full masthead over the subject (the classic) ---
    { id: 'A1', name: 'Classic Left Stack', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'left', variant: 'classic', micro: 'rail' },
    { id: 'A2', name: 'Classic Right Stack', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'right', variant: 'classic', micro: 'rail' },
    { id: 'A3', name: 'Classic Center Drop', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'center', variant: 'classic', micro: 'rail' },
    { id: 'A4', name: 'Morning Left', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'left', variant: 'classic', micro: 'dateline' },
    { id: 'A5', name: 'Morning Right', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'right', variant: 'classic', micro: 'dateline' },
    { id: 'A6', name: 'Morning Center', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'center', variant: 'classic', micro: 'dateline' },
    { id: 'A7', name: 'Twin Columns Left', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'split', variant: 'symmetric', micro: 'rail' },
    { id: 'A8', name: 'Twin Columns Right', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'split', variant: 'symmetric', micro: 'dateline' },
    { id: 'A9', name: 'Twin Columns Center', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'split', variant: 'symmetric', micro: 'rail' },
    { id: 'A10', name: 'Banner Left', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'left', variant: 'banner', micro: 'dateline' },
    { id: 'A11', name: 'Banner Center', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'center', variant: 'banner', micro: 'dateline' },
    { id: 'A12', name: 'Banner Right', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'right', variant: 'banner', micro: 'rail' },
    // -- B · Position 4.3: masthead in the calm side strip (whitespace) ------
    { id: 'B1', name: 'Strip Haven Left', template: 'SIDE-STRIP', mhX: 0.27, mhY: 0.21, mhWidth: 48, cluster: 'left', variant: 'classic', micro: 'rail' },
    { id: 'B2', name: 'Strip Haven Right', template: 'SIDE-STRIP', mhX: 0.73, mhY: 0.21, mhWidth: 48, cluster: 'right', variant: 'classic', micro: 'rail' },
    { id: 'B3', name: 'Strip Twins Left', template: 'SIDE-STRIP', mhX: 0.27, mhY: 0.21, mhWidth: 48, cluster: 'split', variant: 'symmetric', micro: 'dateline' },
    { id: 'B4', name: 'Strip Twins Right', template: 'SIDE-STRIP', mhX: 0.73, mhY: 0.21, mhWidth: 48, cluster: 'split', variant: 'symmetric', micro: 'dateline' },
    { id: 'B5', name: 'Strip Banner Left', template: 'SIDE-STRIP', mhX: 0.27, mhY: 0.21, mhWidth: 48, cluster: 'center', variant: 'banner', micro: 'dateline' },
    { id: 'B6', name: 'Strip Banner Right', template: 'SIDE-STRIP', mhX: 0.73, mhY: 0.21, mhWidth: 48, cluster: 'center', variant: 'banner', micro: 'rail' },
    // -- C · Position B: deep layer, dense photo, sandwich masthead ----------
    { id: 'C1', name: 'Deep Center Strip', template: 'DEEP-LAYER', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'center', variant: 'classic', micro: 'dateline' },
    { id: 'C2', name: 'Deep Statement', template: 'DEEP-LAYER', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'center', variant: 'statement', micro: 'dateline' },
    { id: 'C3', name: 'Deep Left Column', template: 'DEEP-LAYER', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'left', variant: 'classic', micro: 'rail' },
    { id: 'C4', name: 'Deep Right Column', template: 'DEEP-LAYER', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'right', variant: 'classic', micro: 'rail' },
    { id: 'C5', name: 'Deep Banner', template: 'DEEP-LAYER', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'center', variant: 'banner', micro: 'dateline' },
    { id: 'C6', name: 'Deep Split', template: 'DEEP-LAYER', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'split', variant: 'symmetric', micro: 'rail' },
    { id: 'C7', name: 'Deep Split Morning', template: 'DEEP-LAYER', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'split', variant: 'symmetric', micro: 'dateline' },
    { id: 'C8', name: 'Deep Center Rail', template: 'DEEP-LAYER', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'center', variant: 'classic', micro: 'rail' },
    // -- D · Position E: vertical masthead running down an edge --------------
    { id: 'D1', name: 'Spine Left', template: 'VERTICAL', mhX: 0.06, mhY: 0.44, mhWidth: 62, cluster: 'left', variant: 'classic', micro: 'dateline' },
    { id: 'D2', name: 'Spine Right', template: 'VERTICAL', mhX: 0.94, mhY: 0.44, mhWidth: 62, cluster: 'right', variant: 'classic', micro: 'dateline' },
    { id: 'D3', name: 'Spine Twins Left', template: 'VERTICAL', mhX: 0.06, mhY: 0.44, mhWidth: 62, cluster: 'split', variant: 'symmetric', micro: 'dateline' },
    { id: 'D4', name: 'Spine Twins Right', template: 'VERTICAL', mhX: 0.94, mhY: 0.44, mhWidth: 62, cluster: 'split', variant: 'symmetric', micro: 'dateline' },
    { id: 'D5', name: 'Spine Low Stack Left', template: 'VERTICAL', mhX: 0.06, mhY: 0.44, mhWidth: 62, cluster: 'left', variant: 'classic', micro: 'dateline' },
    { id: 'D6', name: 'Spine Low Stack Right', template: 'VERTICAL', mhX: 0.94, mhY: 0.44, mhWidth: 62, cluster: 'right', variant: 'classic', micro: 'dateline' },
    // -- E · Position F: inverted commemorative bottom masthead --------------
    { id: 'E1', name: 'Inverted Classic', template: 'INVERTED', mhX: 0.5, mhY: 0.87, mhWidth: 84, cluster: 'center', variant: 'classic', micro: 'dateline' },
    { id: 'E2', name: 'Inverted Banner', template: 'INVERTED', mhX: 0.5, mhY: 0.87, mhWidth: 84, cluster: 'center', variant: 'banner', micro: 'dateline' },
    { id: 'E3', name: 'Inverted Twins', template: 'INVERTED', mhX: 0.5, mhY: 0.87, mhWidth: 84, cluster: 'split', variant: 'symmetric', micro: 'rail' },
    { id: 'E4', name: 'Inverted Shift Left', template: 'INVERTED', mhX: 0.35, mhY: 0.87, mhWidth: 84, cluster: 'left', variant: 'classic', micro: 'dateline' },
    { id: 'E5', name: 'Inverted Shift Right', template: 'INVERTED', mhX: 0.65, mhY: 0.87, mhWidth: 84, cluster: 'right', variant: 'classic', micro: 'rail' },
    { id: 'E6', name: 'Inverted Rail', template: 'INVERTED', mhX: 0.5, mhY: 0.87, mhWidth: 84, cluster: 'center', variant: 'classic', micro: 'rail' },
    // -- F · Crossovers: art-director remixes of the grammar -----------------
    { id: 'F1', name: 'Crossover L Rail', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.18, mhWidth: 88, cluster: 'left', variant: 'classic', micro: 'rail' },
    { id: 'F2', name: 'Crossover R Rail', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.18, mhWidth: 88, cluster: 'right', variant: 'classic', micro: 'rail' },
    { id: 'F3', name: 'Crossover L Date', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.18, mhWidth: 88, cluster: 'left', variant: 'classic', micro: 'dateline' },
    { id: 'F4', name: 'Crossover R Date', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.18, mhWidth: 88, cluster: 'right', variant: 'classic', micro: 'dateline' },
    { id: 'F5', name: 'Crossover C Rail', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.19, mhWidth: 84, cluster: 'center', variant: 'classic', micro: 'rail' },
    { id: 'F6', name: 'Crossover C Date', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.19, mhWidth: 84, cluster: 'center', variant: 'classic', micro: 'dateline' },
    { id: 'F7', name: 'Crossover Split Rail', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.16, mhWidth: 90, cluster: 'split', variant: 'symmetric', micro: 'rail' },
    { id: 'F8', name: 'Crossover Split Date', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.16, mhWidth: 90, cluster: 'split', variant: 'symmetric', micro: 'dateline' },
    { id: 'F9', name: 'Crossover Banner L', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.18, mhWidth: 88, cluster: 'left', variant: 'banner', micro: 'rail' },
    { id: 'F10', name: 'Crossover Banner R', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.18, mhWidth: 88, cluster: 'right', variant: 'banner', micro: 'dateline' },
    { id: 'F11', name: 'Crossover Twins C', template: 'TOP-MASTHEAD', mhX: 0.5, mhY: 0.16, mhWidth: 90, cluster: 'split', variant: 'symmetric', micro: 'dateline' },
    { id: 'F12', name: 'Crossover Statement', template: 'DEEP-LAYER', mhX: 0.5, mhY: 0.17, mhWidth: 92, cluster: 'center', variant: 'statement', micro: 'rail' },
];

// ---------------------------------------------------------------------------
// AI ART DIRECTION — the assemble contract (user ruling):
// The app OFFERS the AI a menu of every structural choice the composer can
// materialize; the AI art-directs — it reads the photo's negative space and
// the story, then picks from the menu; the composer does what it alone can
// do: the geometry, the type ladder, the plates, the scan mathematics, the
// no-overlap guarantee. The AI never draws a box; it chooses which boxes
// get drawn. Everything it returns is validated against these menus — a
// hallucinated value is dropped and the deterministic fallback owns it.
// ---------------------------------------------------------------------------

export type DirectionTemplate = 'TOP-MASTHEAD' | 'SIDE-STRIP' | 'DEEP-LAYER' | 'VERTICAL' | 'INVERTED';
export type DirectionCluster = 'left' | 'right' | 'center' | 'split';
export type DirectionTreatment = 'editorial' | 'strip' | 'statement' | 'banner' | 'symmetric';
export type DirectionMastheadDepth = 'front' | 'behind';
export type DirectionMainLinePos = 'below-chin' | 'above-head' | 'side' | 'bottom' | 'over-body';
export type DirectionPalette = 'editorial' | 'mono' | 'duotone' | 'accent';
export type DirectionSpecial = 'none' | 'border' | 'diagonal';
export type DirectionTone = 'paper' | 'ink' | 'accent';
export type DirectionMastheadScale = 'monumental' | 'classic' | 'compact';
export type DirectionEnergy = 'quiet' | 'balanced' | 'loud';
export type DirectionMastheadRot = 'none' | 'spine-left' | 'spine-right';

export interface ArtDirection {
    /** Which masthead system anchors the page (the anatomy's positions). */
    template?: DirectionTemplate;
    /** Which flank the coverline stack colonises. */
    cluster?: DirectionCluster;
    /** How the feature coverline is treated. */
    treatment?: DirectionTreatment;
    /** §4.1/§4.2 — masthead in front of the subject, or the celebrity sandwich behind it. */
    mastheadDepth?: DirectionMastheadDepth;
    /** §6 — where the main coverline sits relative to the subject's body. */
    mainLinePos?: DirectionMainLinePos;
    /** §9 — the colour system for this edition. */
    palette?: DirectionPalette;
    /** §10 — the special-issue signal ('border' is rare punctuation, never a default). */
    special?: DirectionSpecial;
    /** Which floor corner carries the barcode/QR. */
    scanCorner?: 'left' | 'right';
    /** Where the badge pill sits. */
    badgeSpot?: 'top' | 'cluster' | 'corner';
    /** Ask for the rotated spine rail instead of the dateline (quiet genres). */
    rail?: boolean;
    /** §9 — the masthead's ink: paper (light), ink (dark — light photos only), accent. */
    tone?: DirectionTone;
    /** ONE hex the AI actually saw in the photo (wardrobe / set / light). Hex-validated. */
    accent?: string;
    /** §12 — the masthead's scale attitude: monumental sprawl / classic band / compact nameplate. */
    mastheadScale?: DirectionMastheadScale;
    /** The edition's energy — biases grain, dim and furniture density. */
    energy?: DirectionEnergy;
    /** §7.6 — run the masthead VERTICAL on a spine edge (the reclining-subject
     *  statement: the head crossing the giant rotated wordmark IS the sandwich). */
    mastheadRot?: DirectionMastheadRot;
    /** One-line composition rationale (the art director's voice, ≤120 chars). */
    note?: string;
}

export const ART_DIRECTION_MENU = {
    templates: ['TOP-MASTHEAD', 'SIDE-STRIP', 'DEEP-LAYER', 'VERTICAL', 'INVERTED'],
    clusters: ['left', 'right', 'center', 'split'],
    treatments: ['editorial', 'strip', 'statement', 'banner', 'symmetric'],
    mastheadDepths: ['front', 'behind'],
    mainLinePoses: ['below-chin', 'above-head', 'side', 'bottom', 'over-body'],
    palettes: ['editorial', 'mono', 'duotone', 'accent'],
    specials: ['none', 'border', 'diagonal'],
    scanCorners: ['left', 'right'],
    badgeSpots: ['top', 'cluster', 'corner'],
    tones: ['paper', 'ink', 'accent'],
    mastheadScales: ['monumental', 'classic', 'compact'],
    energies: ['quiet', 'balanced', 'loud'],
    mastheadRots: ['none', 'spine-left', 'spine-right'],
} as const;

/** Validate a raw (AI) direction object — every key checked against the
 *  live menus; unknown values are dropped, never trusted. An empty result
 *  means "no direction" and the deterministic fallback owns the solve. */
export function sanitizeArtDirection(raw: unknown, analysis?: PhotoAnalysis | null): ArtDirection {
    const r = (raw ?? {}) as Record<string, unknown>;
    const oneOf = <T extends string>(v: unknown, menu: readonly T[]): T | undefined =>
        typeof v === 'string' && (menu as readonly string[]).includes(v) ? (v as T) : undefined;
    const out: ArtDirection = {};
    const t = oneOf(r.template, ART_DIRECTION_MENU.templates);
    if (t) out.template = t;
    const c = oneOf(r.cluster, ART_DIRECTION_MENU.clusters);
    if (c) out.cluster = c;
    const tr = oneOf(r.treatment, ART_DIRECTION_MENU.treatments);
    if (tr) out.treatment = tr;
    const sc = oneOf(r.scanCorner, ART_DIRECTION_MENU.scanCorners);
    if (sc) out.scanCorner = sc;
    const bs = oneOf(r.badgeSpot, ART_DIRECTION_MENU.badgeSpots);
    if (bs) out.badgeSpot = bs;
    const md = oneOf(r.mastheadDepth, ART_DIRECTION_MENU.mastheadDepths);
    if (md) out.mastheadDepth = md;
    const ml = oneOf(r.mainLinePos, ART_DIRECTION_MENU.mainLinePoses);
    if (ml) out.mainLinePos = ml;
    const pm = oneOf(r.palette, ART_DIRECTION_MENU.palettes);
    if (pm) out.palette = pm;
    const sp = oneOf(r.special, ART_DIRECTION_MENU.specials);
    if (sp) out.special = sp;
    if (typeof r.rail === 'boolean') out.rail = r.rail;
    const tn = oneOf(r.tone, ART_DIRECTION_MENU.tones);
    if (tn) out.tone = tn;
    const msc = oneOf(r.mastheadScale, ART_DIRECTION_MENU.mastheadScales);
    if (msc) out.mastheadScale = msc;
    const en = oneOf(r.energy, ART_DIRECTION_MENU.energies);
    if (en) out.energy = en;
    const mr = oneOf(r.mastheadRot, ART_DIRECTION_MENU.mastheadRots);
    if (mr) out.mastheadRot = mr;
    if (typeof r.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.accent.trim())) out.accent = r.accent.trim().toLowerCase();
    if (typeof r.note === 'string' && r.note.trim()) out.note = r.note.trim().slice(0, 120);

    // --- SEMANTIC PAIRING NORMALIZATION ---
    // 1. PAIRING LAW — 'over-body' is strictly the opaque statement plate;
    // ANY clean treatment (editorial / strip / banner / symmetric) paired
    // with it is an AI contradiction — auto-correct mainLinePos to 'bottom'
    // before the resolver can force plates the art direction never asked for.
    if (out.mainLinePos === 'over-body' && out.treatment !== 'statement') {
        out.mainLinePos = 'bottom';
    }

    // 2. Symmetric twin columns require BOTH flanks to be calm.
    // If analysis indicates a crowded flank, subject reclining horizontally,
    // or calm space < 35%, symmetric is physically impossible.
    if (analysis && (out.treatment === 'symmetric' || out.cluster === 'split')) {
        const leftOk = analysis.leftSpace >= 0.35;
        const rightOk = analysis.rightSpace >= 0.35;
        const horizontal = analysis.pose === 'horizontal';
        if (!leftOk || !rightOk || horizontal) {
            out.treatment = 'strip';
            out.cluster = analysis.leftSpace > analysis.rightSpace ? 'left' : analysis.bottomSpace >= 0.4 ? 'center' : 'right';
        }
    }

    // 3. For VERTICAL template (spine wordmark), the cluster cannot fight the spine rail.
    if (out.template === 'VERTICAL' || out.mastheadRot === 'spine-left' || out.mastheadRot === 'spine-right') {
        if (!out.cluster || out.cluster === 'split') {
            out.cluster = 'center';
        }
    }

    return out;
}

// ---------------------------------------------------------------------------
// THE COMPOSER — consolidates every component into one cover, with the
// photo's measured negative space selecting the composition template.
// ---------------------------------------------------------------------------

export function composeSystemCover(opts: {
    style: SystemAutoStyle;
    seed?: number;
    photoLight?: boolean;
    analysis?: PhotoAnalysis | null;
    content?: SystemContentInput;
    layoutId?: string;
    /** AI art direction (pre-validated) — outranks pool and rng. */
    direction?: ArtDirection | null;
    /** Brand-kit palette — when present the accent outranks the genre's own. */
    brand?: { primary: string; accent: string };
    /** Archetype hint (e.g. 'vogue-deep-layer', 'time-frame', etc.) */
    archetype?: string;
    /** §16 — the photo palette (measured + AI-harmonized). When present,
     *  the typography's ink and paper become the photograph's own deepest
     *  shadow and lightest surface, and the accent chain gains the photo's
     *  dominant saturated hue. */
    swatches?: PhotoSwatches | null;
}): ComposedCover {
    const seed = (opts.seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const rng = mulberry32(seed);
    const a = opts.analysis ?? null;
    const rawStyle = opts.style;
    const style: SystemStyleId = matchGenreToStyle(rawStyle) ?? (rawStyle !== 'auto' && (AUTO_PICKS as readonly string[]).includes(rawStyle) ? (rawStyle as SystemStyleId) : (a ? vibePick(a) : pickFrom(rng, AUTO_PICKS)));
    const g = GENRES[style];
    const brandAccent = opts.brand?.accent?.trim() ?? '';
    // §Brand — the PRIMARY is the structural tint (badge plate, frame
    // stroke). It used to be a dead control: only the accent was ever
    // consumed here, so the kit's primary input changed nothing.
    const brandPrimary = opts.brand?.primary?.trim() ?? '';
    const photoLight = opts.photoLight ?? a?.photoLight ?? false;
    // §16 — the photo palette. Measured upstream, harmonized against the
    // AI's claims; absent for stock work (pure ink/paper, unchanged).
    const sw = opts.swatches ?? null;
    const photoAccent = sw?.accentPrimary || '';
    const content = opts.content ?? {};
    const dir = opts.direction ? sanitizeArtDirection(opts.direction, a) : null;
    const archId = opts.archetype || (style ? ARCHETYPE_OF_STYLE[style] : undefined);

    // §7.5 — THE AI DESIGN BRIEF, materialized. The direction now carries
    // taste decisions beyond structure: tone (the masthead's ink), accent
    // (one hex mined from the photo itself), mastheadScale (the §12 scale
    // attitude) and energy (the finishing bias). Validated upstream by the
    // sanitizer — this is the AI doing DESIGN WORK; the resolver only
    // turns each decision into geometry.
    const dirTone = dir?.tone ?? '';
    const dirAccent = dir?.accent ?? '';
    const dirScale = dir?.mastheadScale ?? '';
    const dirEnergy = dir?.energy ?? 'balanced';

    // §V — THE EDITION VARIANT ROLL. A direction pins the BRAND SYSTEM
    // (template · cluster · treatment · palette · tone); WITHIN that
    // system the per-click seed rolls a visibly different REALIZATION —
    // placement band, micro voice, badge spot, teaser density. Same
    // brand, a different issue: the one-centimetre-jitter era ends here.
    // The roll only spends freedom the AI left on the table — an explicit
    // pick (mainLinePos, rail, badgeSpot, treatment) always wins.
    type FeatureBand = 'mid' | 'floor' | 'high' | 'statement';
    let variantBand: FeatureBand = 'floor';
    let variantMicro: 'rail' | 'dateline' = 'dateline';
    let variantBadge: 'top' | 'cluster' | 'corner' = 'top';
    let variantTeasers = -1;
    if (dir) {
        variantBand = (['high', 'mid', 'floor'] as const)[Math.floor(rng() * 3)];
        // A loud edition may elect the statement plate as its feature
        // treatment — only when the AI left the treatment unpicked.
        if (!dir.treatment && dirEnergy === 'loud' && rng() < 0.25) variantBand = 'statement';
        variantMicro = rng() < 0.45 ? 'rail' : 'dateline';
        variantBadge = (['top', 'cluster', 'corner'] as const)[Math.floor(rng() * 3)];
        variantTeasers =
            dirEnergy === 'loud'
                ? rng() < 0.6 ? 1 : 0
                : dirEnergy === 'quiet'
                    ? 1 + Math.floor(rng() * 2)
                    : rng() < 0.4 ? 1 : 0;
    }

    // -- template selection: the photograph dictates the composition ---------
    const hasHeadroom = a ? a.headroom > 0.5 : rng() < 0.45;
    let calmSide: 'left' | 'right' = a ? (a.leftSpace >= a.rightSpace ? 'left' : 'right') : rng() < 0.5 ? 'left' : 'right';
    if (a && Math.abs(a.leftSpace - a.rightSpace) < 0.06 && a.subjectX !== 'center') {
        calmSide = a.subjectX === 'left' ? 'right' : 'left';
    }
    const sideCalm = a ? Math.max(a.leftSpace, a.rightSpace) : 0.4 + rng() * 0.3;
    const bothCalm = a ? Math.min(a.leftSpace, a.rightSpace) : 0.25 + rng() * 0.3;

    const lib = opts.layoutId ? LAYOUT_LIBRARY.find((e) => e.id === opts.layoutId) : undefined;
    if (lib && (lib.cluster === 'left' || lib.cluster === 'right')) calmSide = lib.cluster;
    if (dir?.cluster === 'left' || dir?.cluster === 'right') calmSide = dir.cluster;

    type Template = 'TOP-MASTHEAD' | 'SIDE-STRIP' | 'DEEP-LAYER' | 'VERTICAL' | 'INVERTED';
    let template: Template;
    if (dir?.template) template = dir.template;
    else if (archId === 'time-frame' || archId === 'natgeo-frame' || archId === 'classic-vogue') template = 'TOP-MASTHEAD';
    else if (archId === 'vogue-deep-layer' || archId === 'bazaar-soft' || archId === 'avant-garde') template = 'DEEP-LAYER';
    else if (archId === 'indie-minimal') template = 'SIDE-STRIP';
    else if (archId === 'inverted-commemorative') template = 'INVERTED';
    else if (hasHeadroom) template = 'TOP-MASTHEAD';
    else if (sideCalm > 0.42) template = 'SIDE-STRIP';
    else template = 'DEEP-LAYER';
    if (!dir && lib) {
        // VETO: Never let a blind layout library template force INVERTED or VERTICAL
        // when the photo has ample calm headroom (>= 45%)!
        if (hasHeadroom && (lib.template === 'INVERTED' || lib.template === 'VERTICAL')) {
            template = 'TOP-MASTHEAD';
        } else {
            template = lib.template;
        }
    }
    // §7 POSE — a horizontal body has no calm side columns: the whitespace
    // strategy and the spine rail are vertical-pose moves. When the
    // subject reclines, the bands carry everything (unless the AI, who was
    // TOLD the pose, insists on a template anyway).
    const horizontal = a?.pose === 'horizontal';
    if (horizontal && !dir?.template && (template === 'SIDE-STRIP' || template === 'VERTICAL')) {
        template = hasHeadroom ? 'TOP-MASTHEAD' : 'DEEP-LAYER';
    }

    const text: SystemTextSpec[] = [];
    const shapes: SystemShapeSpec[] = [];
    let stamp = 0;
    const nid = (p: string) => `sys-${p}-${stamp++}`;

    // §16 THE PHOTO PALETTE — ink and paper are the photograph's own tones
    // (deepest shadow / lightest surface) when swatches are on the table,
    // so the type reads printed WITH the image, not stamped on it. The
    // extractor guarantees paper ≥0.90 and ink ≤0.17 luminance, so every
    // plating and polarity decision below keeps its contrast by construction.
    const PAPER = sw?.paperNeutral || '#FFFFFF';
    const INK = sw?.inkDark || '#000000';
    const plateFill = photoLight ? INK : PAPER;
    const plateInk = photoLight ? PAPER : INK;

    const BOLD_GENRES: SystemStyleId[] = [
        'zine', 'dazed', 'cyber', 'gq', 'noir', 'vogue', 'vinyl',
        'natgeo', 'time', 'eye', 'bazaar', 'fragments',
    ];
    const isBoldGenre = BOLD_GENRES.includes(style);

    // -- 1 · MASTHEAD (hierarchy 10 — the brand's fixed identity) ------------
    const mastheadWidth = g.mastheadFont.widthPct[0] + rng() * (g.mastheadFont.widthPct[1] - g.mastheadFont.widthPct[0]);
    let mhX = 0.5;
    let mhY = 0.22 + rng() * 0.04;
    let mhWidth = Math.round(mastheadWidth);
    let mhDepth: 'behind' | 'front' = 'behind';
    let mhRot = 0;

    // Archetype brand placements (Position A, B, C, D, E, F) — the brand
    // DEFAULT. A live art direction outranks it: the archetype branches
    // are skipped and the per-template geometry below carries the pick.
    if (!dir && archId === 'time-frame') {
        template = 'TOP-MASTHEAD';
        mhX = 0.5;
        mhY = 0.12;
        mhWidth = 50;
        mhDepth = 'front';
    } else if (!dir && archId === 'natgeo-frame') {
        template = 'TOP-MASTHEAD';
        mhX = 0.5;
        mhY = 0.11;
        mhWidth = 56;
        mhDepth = 'front';
    } else if (!dir && archId === 'classic-vogue') {
        template = 'TOP-MASTHEAD';
        mhX = 0.5;
        mhY = 0.11;
        mhWidth = 90;
        mhDepth = 'front';
    } else if (!dir && archId === 'vogue-deep-layer') {
        template = 'DEEP-LAYER';
        mhX = 0.5;
        mhY = 0.14;
        mhWidth = 92;
        mhDepth = 'behind';
    } else if (!dir && archId === 'bazaar-soft') {
        template = 'DEEP-LAYER';
        mhX = 0.5;
        mhY = 0.13;
        mhWidth = 88;
        mhDepth = 'behind';
    } else if (!dir && archId === 'indie-minimal') {
        template = 'SIDE-STRIP';
        mhX = 0.24;
        mhY = 0.09;
        mhWidth = 42;
        mhDepth = 'front';
    } else if (!dir && archId === 'tabloid-stack') {
        mhX = 0.5;
        mhY = 0.12;
        mhWidth = 88;
        mhDepth = 'front';
    } else if (!dir && archId === 'bottom-strip') {
        template = 'TOP-MASTHEAD';
        mhX = 0.5;
        mhY = 0.12;
        mhWidth = 90;
        mhDepth = 'front';
    } else if (!dir && archId === 'inverted-commemorative') {
        template = 'INVERTED';
        mhX = 0.5;
        mhY = 0.88;
        mhWidth = 74;
        mhDepth = 'front';
    } else if (!dir && archId === 'avant-garde') {
        template = 'DEEP-LAYER';
        mhX = 0.5;
        mhY = 0.22;
        mhWidth = 94;
        mhDepth = 'behind';
    } else if (template === 'TOP-MASTHEAD') {
        mhY = hasHeadroom ? 0.11 : 0.20;
        mhDepth = hasHeadroom ? 'front' : 'behind';
    } else if (template === 'SIDE-STRIP') {
        mhX = calmSide === 'left' ? 0.27 : 0.73;
        mhY = 0.18 + rng() * 0.04;
        mhWidth = Math.round(Math.min(mhWidth, 48));
        mhDepth = 'behind';
    } else if (template === 'VERTICAL') {
        mhRot = calmSide === 'left' ? -90 : 90;
        mhX = calmSide === 'left' ? 0.06 : 0.94;
        mhY = 0.44;
        mhWidth = 62;
        mhDepth = 'behind';
    } else if (template === 'INVERTED') {
        mhY = 0.88;
        mhWidth = Math.round(Math.min(mhWidth, 80));
        mhDepth = 'front';
    }

    if (lib && !archId) {
        mhX = lib.mhX;
        mhY = template === 'TOP-MASTHEAD' ? Math.max(0.18, lib.mhY) : lib.mhY;
        mhWidth = Math.round(Math.min(mhWidth, lib.mhWidth));
    }
    // §12 SCALE ATTITUDE — the brief's mastheadScale outranks the band
    // defaults: monumental = the heritage sprawl (taller, wider, pinned
    // higher); compact = the newsstand nameplate (small, centred, the
    // newspaper voice). Hierarchy law: the masthead is the page's #1
    // size, always — the attitude changes HOW it leads, not whether.
    let mhHeightPct = 16;
    if (dirScale === 'monumental') {
        mhHeightPct = 20;
        mhWidth = Math.max(mhWidth, template === 'VERTICAL' ? 66 : 94);
        if (template === 'TOP-MASTHEAD' || template === 'DEEP-LAYER') mhY = Math.min(mhY, 0.15);
    } else if (dirScale === 'compact') {
        mhHeightPct = 11;
        if (template !== 'VERTICAL') {
            mhX = 0.5;
            mhWidth = Math.min(mhWidth, 54);
        }
    }
    // §4.1/§4.2 — hierarchy inversion is an art-direction decision:
    // 'behind' = the celebrity sandwich (the subject's head overlaps the
    // brand; the hairline stroke keeps it ≥70% legible), 'front' = the
    // classic over-head masthead. Only the flat-top templates honour it —
    // SIDE-STRIP / VERTICAL / INVERTED own their depth grammar.
    if (dir?.mastheadDepth && (template === 'TOP-MASTHEAD' || template === 'DEEP-LAYER')) {
        mhDepth = dir.mastheadDepth;
    }
    // §10 diagonal — the cover-wrap masthead (Style Classique): the brand
    // tips off-axis. Only the flat-top templates; it leans ±(8-14)° toward
    // the calm side so the subject counterbalances the tilt.
    if (dir?.special === 'diagonal' && (template === 'TOP-MASTHEAD' || template === 'DEEP-LAYER')) {
        mhRot = (calmSide === 'left' ? -1 : 1) * (8 + Math.round(rng() * 6));
    }
    // §7.6 SPINE MASTHEAD — the reclining-subject statement: the major
    // wordmark runs VERTICAL on the edge where the subject's head rests
    // (270° reads bottom-to-top on the left spine, 90° top-to-bottom on
    // the right), weight 900, BEHIND the head — the head crossing the
    // giant rotated letters IS the sandwich. Additive to any template:
    // the horizontal band the masthead vacates stays free for coverlines.
    let spineSide: 'left' | 'right' | null = null;
    if (dir?.mastheadRot === 'spine-left') spineSide = 'left';
    else if (dir?.mastheadRot === 'spine-right') spineSide = 'right';
    else if (dir && horizontal && rng() < 0.18) {
        // §V freedom spend: the AI left the spine unpinned — the variant
        // roll may spend it on the body's lean side for a reclining subject.
        spineSide = a?.subjectX === 'left' ? 'left' : a?.subjectX === 'right' ? 'right' : rng() < 0.5 ? 'left' : 'right';
    }
    if (spineSide) {
        mhRot = spineSide === 'left' ? -90 : 90;
        mhX = spineSide === 'left' ? 0.075 : 0.925;
        mhY = 0.46 + rng() * 0.04;
        mhWidth = Math.max(mhWidth, dirScale === 'monumental' ? 74 : 60); // the vertical run length
        mhDepth = 'behind'; // the head overlaps the rotated wordmark
    }

    text.push({
        id: 'box-masthead',
        text: content.masthead?.trim() || pickFrom(rng, g.mastheads),
        fontId: g.mastheadFont.fontId,
        weight: spineSide ? 900 : g.mastheadFont.weight,
        italic: g.mastheadFont.italic,
        caseMode: g.mastheadFont.caseMode ?? 'uppercase',
        fitToWidth: true,
        widthPct: mhWidth,
        heightPct: mhHeightPct,
        letterSpacingEm: dirScale === 'monumental' ? Math.min(0.2, g.mastheadFont.tracking + 0.015) : g.mastheadFont.tracking,
        // §9 tone — the AI's masthead ink, contrast-guarded: ink dies on a
        // dark photo (paper takes over). With the brand kit ON the kit's
        // accent OUTRANKS the AI's pick — a saved kit is law, not a
        // suggestion — then the AI accent, photo accent and genre accent
        // before paper.
        color: dirTone === 'ink'
            ? (photoLight ? INK : PAPER)
            : dirTone === 'accent'
                ? (brandAccent || dirAccent || photoAccent || g.accent || PAPER)
                : style === 'kinfolk' ? '#F7F6F0' : PAPER,
        strokeEm: mhDepth === 'behind' ? 0.015 : 0,
        strokeColor: INK,
        opacity: 1,
        rotationDeg: mhRot,
        depth: mhDepth,
        xPct: mhX,
        yPct: mhY,
    });

    // -- 2 · DATELINE (hierarchy 3, top band, machine voice) ------------------
    let useRail = lib
        ? !isBoldGenre && lib.micro === 'rail' && template !== 'VERTICAL'
        : template !== 'VERTICAL' && !isBoldGenre && (g.rail !== 'none' || rng() < 0.15);
    if (dir && dir.rail !== undefined) useRail = dir.rail && !isBoldGenre && template !== 'VERTICAL';
    // §V — when the AI left the micro voice unpinned, the edition roll
    // decides rail vs dateline (a real per-issue choice, not jitter).
    else if (dir) useRail = variantMicro === 'rail' && !isBoldGenre && template !== 'VERTICAL';
    const railSide: 'left' | 'right' = g.rail !== 'none' && template !== 'SIDE-STRIP' ? g.rail : calmSide === 'left' ? 'right' : 'left';

    let dateText = '';
    if (useRail) {
        const railText = content.rail?.trim() || fill(rng, pickFrom(rng, g.railTexts));
        text.push({
            id: 'box-rail',
            text: railText,
            fontId: g.microFont.fontId,
            weight: g.microFont.weight,
            caseMode: 'uppercase',
            fitToWidth: true,
            widthPct: microWidthForLine(railText.replace(/\s+/g, ' ').length, 2.3),
            heightPct: 2.4,
            letterSpacingEm: 0.14,
            // The rail is the dateline's twin micro voice — with the brand
            // kit ON it carries the accent (the dateline branch already
            // does); without a kit it stays classic paper.
            color: brandAccent || PAPER,
            opacity: 0.82,
            rotationDeg: railSide === 'left' ? -90 : 90,
            depth: 'front',
            xPct: railSide === 'left' ? 0.055 : 0.945,
            yPct: 0.44,
        });
    } else {
        dateText = (content.dateline?.trim() || fill(rng, pickFrom(rng, g.dateline))).toUpperCase();
        const dateY = (template === 'TOP-MASTHEAD' && mhY <= 0.16)
            ? round002(mhY + (mhHeightPct / 200) + 0.022)
            : mhY >= 0.18
                ? 0.045
                : 0.055;
        text.push({
            id: 'box-dateline',
            text: dateText,
            fontId: g.microFont.fontId,
            weight: g.microFont.weight,
            caseMode: 'uppercase',
            fitToWidth: true,
            widthPct: microWidthForLine(dateText.replace(/\s+/g, ' ').length, 1.9),
            heightPct: 1.8,
            letterSpacingEm: 0.12,
            color: brandAccent || (g.accent && (style === 'natgeo' || style === 'cyber') ? g.accent : PAPER),
            opacity: 0.9,
            rotationDeg: 0,
            depth: 'front',
            xPct: 0.5,
            yPct: dateY,
        });
    }

    // -- 3 · FEATURE COVERLINE + SUB + TEASER STACK ---------------------------
    // Treatment selection: 'editorial' is the gold standard for high-end covers.
    // Pure, unplated typography living in the calm negative space.
    let banner = dir?.treatment === 'banner' || (lib?.variant === 'banner');
    let isStatement = dir?.treatment === 'statement' || (lib?.variant === 'statement');
    let symmetric = dir?.treatment === 'symmetric' || (lib?.variant === 'symmetric') || (dir?.cluster === 'split');
    if (dir?.treatment === 'strip' || dir?.treatment === 'editorial') {
        isStatement = false;
    } else if (dir?.mainLinePos === 'over-body') {
        isStatement = true;
    } else if (dir && variantBand === 'statement') {
        isStatement = true;
    }
    if (banner) variantBand = 'floor';

    // SUBJECT SANCTITY:
    // Never allow a blind layout library template or arbitrary roll to force an opaque statement plate
    // or banner over the cutout subject.
    // If negative space is available (calm side >= 35% or headroom >= 40%), pure unplated 'editorial'
    // typography is enforced by doctrine.
    if (!dir && (sideCalm >= 0.35 || hasHeadroom)) {
        isStatement = false;
        banner = false;
    }

    const featureText = content.feature?.trim() || fill(rng, pickFrom(rng, g.features));
    const subText = content.sub?.trim() || fill(rng, pickFrom(rng, g.subs));

    // Determine the active column based on AI direction, archetype, or measured calm negative space
    let activeCluster: 'left' | 'right' | 'center' = 'left';
    if (horizontal) {
        // §7 POSE — the stack lives in a BAND, centred: both flanks are body.
        activeCluster = 'center';
    } else if (dir?.cluster === 'left' || dir?.cluster === 'right' || dir?.cluster === 'center') {
        activeCluster = dir.cluster;
    } else if (archId === 'bazaar-soft') {
        activeCluster = 'right';
    } else if (archId === 'bottom-strip') {
        activeCluster = 'center';
    } else if (a && (a.rightSpace >= 0.38 || a.leftSpace >= 0.38)) {
        // When one flank is calm, always choose the calm flank over centering on the subject!
        activeCluster = a.rightSpace >= a.leftSpace ? 'right' : 'left';
    } else if (template === 'INVERTED') {
        activeCluster = calmSide === 'left' ? 'left' : 'right';
    } else {
        activeCluster = calmSide === 'left' ? 'left' : 'right';
    }
    // §5.3 gate — twin columns need BOTH flanks calm (≥35%), an upright
    // subject, and a non-center stack (the twins flank the story). One busy
    // flank, a reclining body, or a centre band turns the twins off. The
    // sanitizer corrects AI picks; this guards the library-variant and
    // cluster-split paths the sanitizer never sees.
    if (symmetric && (horizontal || (a ? a.leftSpace < 0.35 || a.rightSpace < 0.35 : false) || activeCluster === 'center')) {
        symmetric = false;
    }

    let clusterX: number;
    let featureW: number;
    let featureY: number;

    if (activeCluster === 'left') {
        const leftCalm = a ? Math.max(0.35, Math.min(0.72, a.leftSpace)) : 0.50;
        // Float to the optical centroid of the calm space
        clusterX = round002(Math.max(0.20, Math.min(0.30, leftCalm * 0.48)));
        // Dynamically scale column width to the negative space: expansive air gets bolder width
        featureW = round002(Math.max(38, Math.min(50, leftCalm * 72)));
        featureY = template === 'SIDE-STRIP' ? 0.62 + rng() * 0.04 : 0.74 + rng() * 0.03;
    } else if (activeCluster === 'right') {
        const rightCalm = a ? Math.max(0.35, Math.min(0.72, a.rightSpace)) : 0.50;
        clusterX = round002(Math.min(0.80, Math.max(0.70, 1 - rightCalm * 0.48)));
        featureW = round002(Math.max(38, Math.min(50, rightCalm * 72)));
        featureY = template === 'SIDE-STRIP' ? 0.62 + rng() * 0.04 : 0.74 + rng() * 0.03;
    } else {
        // Center cluster:
        // When a vertical spine rail occupies the left edge (spine-left / VERTICAL),
        // shift center slightly right (0.54) and cap feature width (64) so it never touches
        // the spine letters. If spine-right, shift slightly left (0.46).
        const hasLeftSpine = spineSide === 'left' || template === 'VERTICAL';
        const hasRightSpine = spineSide === 'right';
        clusterX = hasLeftSpine ? 0.54 : hasRightSpine ? 0.46 : 0.5;
        featureW = banner ? 88 : (hasLeftSpine || hasRightSpine) ? 64 : 74;
        featureY = template === 'INVERTED' ? 0.68 : 0.82;
    }

    const featureLen = Math.max(6, featureText.replace(/\s+/g, ' ').trim().length);
    const featLayout = banner
        ? { text: featureText.replace(/\s+/g, ' ').trim(), h: capHeightForLine(featureLen, 88, 3.2, 5.0), maxLen: featureLen, lines: 1 }
        : isStatement
            ? layoutForColumn(featureText, featureW, 3.2, 7.5, 3)
            : activeCluster === 'center'
                ? { text: featureText.replace(/\s+/g, ' ').trim(), h: 4.2, maxLen: featureLen, lines: 1 }
                : layoutForColumn(featureText, featureW, 3.4, 5.8, 3);
    const featureH = featLayout.h;

    const subLayout = layoutForColumn(subText, Math.min(60, featureW), 1.7, 2.6, 3);
    const subH = round002(Math.min(featureH * 0.58, subLayout.h));
    const subLines = subLayout.text.split('\n').length;

    const hhF = (featureH * 1.12 * featLayout.lines) / 200;
    const hhS = (subH * 1.12 * subLines) / 200;
    const STACK_FLOOR = template === 'INVERTED' ? 0.76 : 0.872;

    // §6 + §V — WHERE the main coverline sits. An explicit mainLinePos
    // pins the band; otherwise the edition roll owns it (high / mid /
    // floor / statement — four legitimately different issues of the same
    // brand). The stack math below still owns the floor; banners own
    // their band.
    const mainPos: DirectionMainLinePos = dir?.mainLinePos ?? 'below-chin';
    if (dir?.mainLinePos === 'above-head') variantBand = 'high';
    else if (dir?.mainLinePos === 'side') variantBand = 'mid';
    else if (dir?.mainLinePos === 'bottom') variantBand = 'floor';
    else if (dir?.mainLinePos === 'over-body') variantBand = 'statement';
    // §7 POSE — mid-height side columns don't exist for a reclining subject
    // (the body owns the middle); the stack drops to the floor band.
    if (horizontal && variantBand === 'mid') variantBand = 'floor';
    if (variantBand === 'high' && (template === 'TOP-MASTHEAD' || template === 'DEEP-LAYER') && hasHeadroom) {
        featureY = 0.30 + rng() * 0.03;
    } else if (variantBand === 'mid' && (activeCluster === 'left' || activeCluster === 'right')) {
        featureY = 0.44 + rng() * 0.05;
    } else if (variantBand === 'statement') {
        featureY = Math.min(featureY, 0.50 + rng() * 0.06);
    } else if (mainPos === 'bottom') {
        // park the stack flush against the floor — sub bottom at the floor
        featureY = Math.max(0.30, STACK_FLOOR - hhF - 0.015 - 2 * hhS);
    }
    // FACE PROTECTION — with a measured headroom the chin line is known:
    // pure type never prints on the face (a statement plate crossing the
    // torso is legal — opaque and readable — the face is not). faceFloorY
    // is the lowest y the statement plate may park at; the stack lift
    // below honours it whenever the floor leaves room.
    let faceFloorY = 0;
    // (upright-pose math only — a reclining face is not "below the headroom")
    if (a && !horizontal) {
        const faceBottom = Math.max(0.10, 1 - a.headroom) + 0.17;
        if (mainPos === 'over-body' && isStatement) {
            faceFloorY = faceBottom + 0.10;
            featureY = Math.min(0.62, Math.max(featureY, faceFloorY));
        } else if (activeCluster === 'center' && !isStatement && !banner && featureY - hhF < faceBottom) {
            featureY = Math.min(STACK_FLOOR - (hhF + 0.015 + hhS), faceBottom + hhF);
        }
    }

    {
        const naturalSubY = featureY + hhF + 0.015 + hhS;
        const floorSubY = STACK_FLOOR - hhS;
        if (floorSubY < naturalSubY) {
            featureY = Math.max(0.30, floorSubY - hhF - 0.015 - hhS);
        }
    }
    let subY = featureY + hhF + 0.015 + hhS;

    let plateFH = 0;
    let plateSH = 0;
    let bannerH = 0;
    let plateFX = clusterX;
    let plateSX = clusterX;
    const trackF = g.kickerItalic ? 0.05 : 0.08;
    const textHF = (featureH * 1.12 * featLayout.lines) / 100;
    const textWF = measureW(featLayout.maxLen, featureH, trackF, true) / 100;
    const textHS = (subH * 1.12 * subLines) / 100;
    const textWS = measureW(subLayout.maxLen, subH, 0.12, true) / 100;

    if (banner) {
        bannerH = textHF + 2 * Math.max(0.014, textHF * 0.38) + 0.004;
        shapes.push({
            id: nid('banner'),
            kind: 'rect',
            xPct: 0.5,
            yPct: featureY,
            wPct: 100,
            hPct: round002(bannerH * 100),
            fillColor: plateFill,
            fillOn: true,
            strokeColor: INK,
            strokeW: 0,
            cornerPct: 0,
            rotationDeg: 0,
            opacity: 0.98,
            depth: 'front',
        });
    } else if (isStatement) {
        const featurePlateFill = photoLight ? INK : PAPER;
        const subPlateFill = photoLight ? PAPER : INK;
        const padYF = Math.max(0.014, textHF * 0.38);
        const padYS = Math.max(0.014, textHS * 0.38);
        plateFH = textHF + padYF * 2 + 0.004;
        plateSH = textHS + padYS * 2 + 0.004;
        const subGap = Math.max(hhF + hhS + 0.022, plateFH / 2 + plateSH / 2 + 0.003);
        const stackBottom = subGap + (plateFH + plateSH) / 2;
        if (featureY + stackBottom > STACK_FLOOR || featureY < faceFloorY) {
            // clamp into [faceFloorY, floorFit]: the highest y that still
            // parks the stack flush above the floor; the face floor wins
            // whenever it fits under that ceiling (else the floor rules).
            const floorFit = Math.max(0.30, STACK_FLOOR - stackBottom);
            featureY = Math.min(Math.max(faceFloorY, featureY), floorFit);
        }
        subY = featureY + subGap;
        const maxSidePlateW = activeCluster === 'center' ? 94 : Math.min(52, Math.max(34, featureW + 8));
        const plateFW = Math.min(maxSidePlateW, Math.max(26, Math.round((textWF + 2 * Math.max(0.025, textWF * 0.10)) * 100)));
        const plateSW = Math.min(maxSidePlateW, Math.max(24, Math.round((textWS + 2 * Math.max(0.025, textWS * 0.10)) * 100)));
        plateFX = Math.min(0.98 - plateFW / 200, Math.max(0.02 + plateFW / 200, clusterX));
        plateSX = Math.min(0.98 - plateSW / 200, Math.max(0.02 + plateSW / 200, clusterX));
        // SUBJECT SANCTITY RULE:
        // A statement plate or banner must NEVER cover the cutout subject with depth: 'front'.
        // If a subject is present (a or a.subjectBox), any plate crossing the subject must have
        // depth: 'behind' so the cutout subject remains 100% visible in the foreground,
        // or be suppressed into clean unplated typography.
        const plateDepth: 'front' | 'behind' = (a?.subjectBox || a) ? 'behind' : 'front';
        shapes.push({
            id: nid('plate-feature'),
            kind: 'rect',
            xPct: plateFX,
            yPct: featureY,
            wPct: plateFW,
            hPct: round002(plateFH * 100),
            fillColor: featurePlateFill,
            fillOn: true,
            strokeColor: INK,
            strokeW: 0,
            cornerPct: 0,
            rotationDeg: 0,
            opacity: 0.97,
            depth: plateDepth,
        });
        shapes.push({
            id: nid('plate-sub'),
            kind: 'rect',
            xPct: plateSX,
            yPct: subY,
            wPct: plateSW,
            hPct: round002(plateSH * 100),
            fillColor: subPlateFill,
            fillOn: true,
            strokeColor: INK,
            strokeW: 0,
            cornerPct: 0,
            rotationDeg: 0,
            opacity: 0.97,
            depth: plateDepth,
        });
    }

    const featureColor = isStatement
        ? (photoLight ? PAPER : INK)
        : banner
            ? plateInk
            : (photoLight ? INK : PAPER);
    const subColor = isStatement
        ? (photoLight ? INK : PAPER)
        : brandAccent || (g.accent && style === 'gq' ? g.accent : (photoLight ? '#222222' : '#E8E8E8'));

    // §9 — the colour system: 'mono' = silver-gravitas B&W; 'duotone' =
    // era tint; 'accent' = ONE restrained punch on a single element (an
    // unplated feature line wears the brand/genre accent); 'editorial' =
    // the genre's own judgement. Photo treatment follows in §7.
    const dirPalette = dir?.palette ?? 'editorial';
    const accentHex = brandAccent || dirAccent || photoAccent || g.accent || '';
    const featureAccent = dirPalette === 'accent' && !!accentHex && !isStatement && !banner;

    text.push({
        id: 'box-feature',
        text: featLayout.text,
        fontId: g.voiceFont.fontId,
        weight: g.voiceFont.weight,
        italic: g.kickerItalic && !isStatement && !banner,
        caseMode: g.kickerItalic && !isStatement && !banner ? 'original' : 'uppercase',
        fitToWidth: activeCluster === 'center' && !isStatement && !banner,
        widthPct: activeCluster === 'center' && !isStatement && !banner
            ? Math.min(88, Math.max(56, microWidthForLine(featureLen, 4.2)))
            : featureW,
        heightPct: featureH,
        letterSpacingEm: g.kickerItalic ? 0.05 : 0.08,
        color: featureAccent ? accentHex : featureColor,
        opacity: 1,
        rotationDeg: 0,
        depth: 'front',
        xPct: isStatement ? plateFX : clusterX,
        yPct: featureY,
    });

    if (!banner && !(template === 'INVERTED' && !isStatement)) {
        text.push({
            id: 'box-sub',
            text: subLayout.text,
            fontId: g.microFont.fontId,
            weight: Math.max(700, g.microFont.weight),
            caseMode: g.kickerItalic && !isStatement ? 'original' : 'uppercase',
            fitToWidth: false,
            widthPct: featureW,
            heightPct: subH,
            letterSpacingEm: 0.12,
            color: subColor,
            opacity: isStatement ? 1 : 0.88,
            rotationDeg: 0,
            depth: 'front',
            xPct: isStatement ? plateSX : clusterX,
            yPct: subY,
        });
    }

    // -- 3b · TEASER STACK — the secondary coverline column (§5/§12) ----------
    // RUNG STEPPING — the stack descends one rung at a time: size →
    // weight → colour → opacity. The first teaser is nearly the sub's
    // equal; the last is a whisper. All share clusterX — one alignment
    // axis (Gestalt L10). And NOTHING drops below STACK_FLOOR: the scan
    // corner carries its own text, and text on it is text on text.
    const teaserPool = [
        ...(content.teasers || []).map((t) => t.trim()).filter(Boolean),
        ...shuffled(rng, g.teasers),
    ];
    const teaserCount = banner
        ? 0 // the banner IS the statement — nothing rides under it
        : (mainPos === 'bottom' || dir?.treatment === 'strip')
            ? 0 // the stack is parked flush at the floor — no rungs below
            : isStatement
                ? 1
                // §V — the edition roll owns the furniture density when the AI
                // didn't pin it: the energy bias decides how many rungs ride
                // under the sub (clamped by pool + rungs below).
                : variantTeasers >= 0
                    ? variantTeasers
                    // Bold genres: max 1 teaser — clean poster, not a busy newsstand.
                    : isBoldGenre
                        ? (rng() < 0.4 ? 1 : 0)
                        : template === 'DEEP-LAYER'
                            ? rng() < 0.5 ? 1 : 0
                            : template === 'INVERTED'
                                ? 1 + Math.floor(rng() * 2)
                                : 1 + Math.floor(rng() * 2); // quiet genres: 1-2 teasers

    const rungs = [
        { h: round002(Math.max(1.9, subH * 0.74)), weight: 700, color: PAPER, opacity: 0.95 },
        { h: round002(Math.max(1.7, subH * 0.68)), weight: 600, color: '#E8E8E8', opacity: 0.85 },
        { h: round002(Math.max(1.6, subH * 0.63)), weight: 600, color: '#D9D9D9', opacity: 0.76 },
    ];
    let cursorY = banner
        ? featureY + bannerH / 2
        : isStatement
            ? subY + plateSH / 2
            : subY + hhS;
    for (let i = 0; i < teaserCount && i < teaserPool.length && i < rungs.length; i++) {
        const rung = rungs[i];
        const hhT = rung.h / 200;
        // Never enter the scan corner's band — the pile-up that used to
        // smother the barcode lives here, guarded.
        if (cursorY + 0.013 + hhT + hhT > STACK_FLOOR) break;
        cursorY += 0.013 + hhT;
        text.push({
            id: `box-teaser-${i + 1}`,
            text: fill(rng, teaserPool[i]),
            fontId: g.microFont.fontId,
            weight: rung.weight,
            caseMode: g.kickerItalic && style === 'kinfolk' ? 'original' : 'uppercase',
            fitToWidth: false,
            widthPct: Math.max(18, featureW - 8),
            heightPct: rung.h,
            letterSpacingEm: 0.1,
            color: rung.color,
            opacity: rung.opacity,
            rotationDeg: 0,
            depth: 'front',
            xPct: clusterX,
            yPct: cursorY,
        });
        cursorY += hhT;
    }

    // §5.5 BOTTOM STRIP — when the main line is floor-parked, the teasers
    // run as ONE horizontal row above the stack: shared baseline, shared
    // rhythm, equal spacing (proximity + continuity + similarity — the
    // Gestalt read of a print bottom strip).
    // CRITICAL SPATIAL INVARIANT:
    // A 3-teaser horizontal strip across the page is ONLY legal when the cluster is
    // centered (not left/right column), symmetric twin columns are OFF, and the
    // center corridor at stripY is calm (never cutting across the subject's torso/legs).
    const centerCalmAtStrip = a ? (a.headroom > 0.45 || a.bottomSpace > 0.45) : true;
    if (mainPos === 'bottom' && !banner && !horizontal && template !== 'VERTICAL' && activeCluster === 'center' && !symmetric && centerCalmAtStrip) {
        const stripY = Math.max(0.36, featureY - hhF - 0.030);
        const picks = teaserPool
            .slice(0, 3)
            .map((t) => fill(rng, t).replace(/\s+/g, ' ').trim().slice(0, 18))
            .filter(Boolean);
        const xs = picks.length >= 3 ? [0.24, 0.5, 0.76] : picks.length === 2 ? [0.32, 0.68] : [0.5];
        picks.forEach((t, i) => {
            text.push({
                id: `box-teaser-strip-${i + 1}`,
                text: t,
                fontId: g.microFont.fontId,
                weight: 700,
                caseMode: 'uppercase',
                fitToWidth: true,
                widthPct: microWidthForLine(t.length, 1.7),
                heightPct: 1.7,
                letterSpacingEm: 0.12,
                color: PAPER,
                opacity: 0.9,
                rotationDeg: 0,
                depth: 'front',
                xPct: xs[i] ?? 0.5,
                yPct: stripY,
            });
        });
    }

    // SYMMETRIC split (§5.3): two teasers colonise the OPPOSITE calm column
    // at mid-height while the feature cluster keeps its own side — the
    // twin rungs step size and voice exactly like the main stack.
    if (symmetric) {
        const oppX = clusterX < 0.5 ? 0.72 : 0.28;
        const symH = round002(Math.max(1.8, subH * 0.7));
        for (let i = 0; i < 2 && teaserPool.length > i; i++) {
            text.push({
                id: `box-teaser-sym-${i + 1}`,
                text: fill(rng, teaserPool[(i + 2) % teaserPool.length]),
                fontId: g.microFont.fontId,
                weight: i === 0 ? 700 : 600,
                caseMode: 'uppercase',
                fitToWidth: false,
                widthPct: 30,
                heightPct: round002(symH * (1 - i * 0.08)),
                letterSpacingEm: 0.1,
                color: i === 0 ? PAPER : '#E4E4E4',
                opacity: i === 0 ? 0.92 : 0.8,
                rotationDeg: 0,
                depth: 'front',
                xPct: oppX,
                yPct: 0.38 + i * (symH / 100 + 0.024),
            });
        }
    }

    // -- 5 · SCAN — real EAN-13 barcode or scannable QR (folio band) ---------
    // Rule 13: the scan sits in the corner OPPOSITE the main text mass —
    // small (~3–5% of width, quiet corner).
    const mastheadInBottom = template === 'INVERTED' || mhY >= 0.65;
    const scanCornerOverride = dir?.scanCorner === 'left' ? 0.18 : dir?.scanCorner === 'right' ? 0.82 : null;
    const scanX = scanCornerOverride ?? (activeCluster === 'left' ? 0.82 : activeCluster === 'right' ? 0.18 : 0.82);
    const oppScanSide = scanX < 0.5 ? 'right' : 'left';
    const useQr = g.preferQr && rng() < 0.45;
    // When masthead is in bottom half (e.g. INVERTED), barcode MUST sit safely in the top corner (scanY = 0.065),
    // never stamped over bottom masthead letters!
    const scanY = mastheadInBottom ? 0.065 : (useQr ? 0.885 : 0.915);

    // -- 4 · BADGE (pill label — a single voice, one spot) ---------------------
    // The AI's badgeSpot outranks the default: 'top' = the zine pill in
    // RULE #1: The less clutter, the more premium. High-end covers breathe.
    // Badges must NEVER be forced by default. Clutter destroys luxury.
    // Only generate a badge if:
    // 1. Explicitly requested by user content (content.badge?.trim())
    // 2. Explicitly directed by AI (dir?.badgeSpot)
    // 3. For gritty indie zine / brutalist genres where physical stickers are stylistic, at low frequency (~20%)
    const wantsBadge = Boolean(
        content.badge?.trim() ||
        dir?.badgeSpot ||
        ((style === 'zine') && rng() < 0.20)
    );
    if (wantsBadge) {
        let spot: 'top' | 'cluster' | 'corner' =
            template === 'INVERTED'
                ? 'top'
                : dir?.badgeSpot ?? (dir ? variantBadge : isBoldGenre ? 'top' : 'corner');

        // SUBJECT & STATEMENT PROTECTION:
        // A badge must NEVER sit directly in front of the subject's torso or face,
        // nor stack atop a statement plate / full banner (which creates amateur rectangle sandwiching).
        // If the cluster is centered or sits over the body, reroute cluster badges to a quiet folio corner.
        if (spot === 'cluster' && (isStatement || banner || mainPos === 'over-body' || activeCluster === 'center')) {
            spot = 'corner';
        }

        // Determine badge text and dynamic dimensions based on character count:
        let rawBadge = (content.badge?.trim() || fill(rng, pickFrom(rng, g.badges))).toUpperCase().slice(0, 36);
        // Token de-duplication: If badge duplicates words from dateline (e.g. "TOKYO", "ISSUE 04"), swap to editorial badge
        const dateTokens = (dateText || '').split(/[\s•·—–\/\-]+/).map(s => s.trim().toUpperCase()).filter(s => s.length >= 3);
        const hasDuplicateToken = dateTokens.some(token => rawBadge.includes(token));
        if (hasDuplicateToken) {
            const altBadges = [
                'SPECIAL ARCHIVE',
                'COLLECTOR PRINT',
                'DEFINITIVE CUT',
                'GLOBAL MONOGRAPH',
                'SERIES 2026',
                'LIMITED RUN',
                'ARCHIVAL SELECTION',
            ];
            const safeBadges = altBadges.filter(b => {
                const bWords = b.split(/[\s•·—–\/\-]+/).map(s => s.trim().toUpperCase());
                return bWords.every(w => !dateTokens.includes(w));
            });
            rawBadge = pickFrom(rng, safeBadges.length > 0 ? safeBadges : altBadges);
        }
        const badgeLabel = rawBadge;
        const charCount = badgeLabel.length;
        // At standard ~1.4% cap height, monospace Space Mono is ~0.92% width per glyph + ~4.5% horizontal pill padding.
        const idealWPct = Math.round(charCount * 0.92 + 4.5);
        // Keep badge crisp, chic, and bounded — max 44% width so it never becomes a giant slab across the page.
        const badgeWPct = Math.min(44, Math.max(18, idealWPct));
        const badgeHPct = 3.6;

        let badgeX = 0.5;
        let badgeY = 0.08;

        if (spot === 'cluster') {
            // Riding the calm side column above the feature headline
            badgeX = clusterX;
            const featureTop = featureY - hhF;
            badgeY = Math.max(0.14, featureTop - 0.038);
            // If headroom was measured and badgeY collides with the face zone, push to folio corner
            if (a && badgeY < faceFloorY && badgeY > Math.max(0.08, 1 - a.headroom - 0.05)) {
                spot = 'corner';
            }
        }

        if (spot === 'corner') {
            // Classic newsstand folio counterweight: sits in the bottom corner OPPOSITE the scan
            badgeX = oppScanSide === 'left' ? 0.18 : 0.82;
            badgeY = template === 'INVERTED' ? 0.82 : (teaserCount >= 2 && mainPos === 'bottom' ? 0.885 : 0.915);
        } else if (spot === 'top') {
            if (template === 'INVERTED') {
                // Masthead is at bottom; dateline is top-center.
                // Place badge in the corner opposite the scan so they never stack as twin centered labels!
                badgeX = oppScanSide === 'left' ? 0.18 : 0.82;
                badgeY = 0.065;
            } else if (mhY >= 0.18) {
                // DEEP-LAYER or SIDE-STRIP — masthead top starts at mhY - 0.08 >= 0.10
                if (useRail) {
                    badgeX = 0.5;
                    badgeY = 0.065;
                } else {
                    // Dateline sits at 0.055; badge sits in top corner opposite dateline/scan
                    badgeX = oppScanSide === 'left' ? 0.18 : 0.82;
                    badgeY = 0.055;
                }
            } else {
                // TOP-MASTHEAD (masthead at 0.11 spans y: 0.03-0.19 across center).
                // A centered badge at 0.105 collides with the masthead!
                // Place as a top-corner folio chip if dateline leaves room, else bottom corner.
                if (!useRail && scanX >= 0.5) {
                    badgeX = 0.18;
                    badgeY = 0.055;
                } else if (!useRail && scanX < 0.5) {
                    badgeX = 0.82;
                    badgeY = 0.055;
                } else {
                    // Fall back to bottom folio counterweight
                    badgeX = oppScanSide === 'left' ? 0.18 : 0.82;
                    badgeY = 0.915;
                }
            }
        }

        // Clamp badgeX so it respects safe magazine frame margins (3.5% padding)
        const safeMarginPct = badgeWPct / 200 + 0.035;
        badgeX = Math.min(0.965 - badgeWPct / 200, Math.max(safeMarginPct, badgeX));

        const cornerPct = (style === 'noir' || style === 'architectural' || isBoldGenre) ? 0 : 50;

        shapes.push({
            id: nid('badge'),
            kind: 'badge',
            xPct: badgeX,
            yPct: badgeY,
            wPct: badgeWPct,
            hPct: badgeHPct,
            // §Brand — the kit's primary tints the badge plate (the
            // renderer flips the label ink against the fill, so any
            // primary stays legible).
            fillColor: brandPrimary || PAPER,
            fillOn: true,
            strokeColor: INK,
            strokeW: 0,
            cornerPct,
            rotationDeg: 0,
            opacity: 1,
            depth: 'front',
            label: badgeLabel,
        });
    }
    if (useQr) {
        shapes.push({
            id: nid('qr'),
            kind: 'qr',
            xPct: scanX,
            yPct: scanY,
            wPct: 12,
            hPct: 12,
            fillColor: PAPER,
            fillOn: true,
            strokeColor: INK,
            strokeW: 0,
            cornerPct: 0,
            rotationDeg: 0,
            opacity: 0.98,
            depth: 'front',
            label: 'https://creatorskit.app',
        });
    } else {
        shapes.push({
            id: nid('barcode'),
            kind: 'barcode',
            xPct: scanX,
            yPct: scanY,
            wPct: 22,
            hPct: 6.8,
            fillColor: PAPER,
            fillOn: true,
            strokeColor: INK,
            strokeW: 0,
            cornerPct: 0,
            rotationDeg: 0,
            opacity: 0.98,
            depth: 'front',
            label: `9${Math.floor(rng() * 9) + 1}${String(Math.floor(rng() * 900000000000) + 100000000000)}`.slice(0, 13),
        });
    }

    // -- 6 · FRAME — turns the cover into a document ---------------------------
    // §10 — the special-issue frame is punctuation, never a default: the
    // AI must explicitly ask for 'border', and the brand/genre accent
    // outranks plain ink. Archetype frames (TIME red / NatGeo yellow)
    // keep their own authority below.
    if (dir?.special === 'border' && archId !== 'time-frame' && archId !== 'natgeo-frame') {
        shapes.push({
            id: nid('frame-special'),
            kind: 'frame',
            xPct: 0.5,
            yPct: 0.5,
            wPct: 92,
            hPct: 94,
            fillColor: brandPrimary || accentHex || INK,
            fillOn: false,
            strokeColor: brandPrimary || accentHex || INK,
            strokeW: 2.5,
            cornerPct: 0,
            rotationDeg: 0,
            opacity: 1,
            depth: 'front',
        });
    }
    if (archId === 'time-frame') {
        shapes.push({
            id: nid('frame-time'),
            kind: 'frame',
            xPct: 0.5,
            yPct: 0.5,
            wPct: 92,
            hPct: 94,
            fillColor: '#E10600',
            fillOn: false,
            strokeColor: '#E10600',
            strokeW: 3.5,
            cornerPct: 0,
            rotationDeg: 0,
            opacity: 1,
            depth: 'front',
        });
    } else if (archId === 'natgeo-frame') {
        shapes.push({
            id: nid('frame-natgeo'),
            kind: 'frame',
            xPct: 0.5,
            yPct: 0.5,
            wPct: 92,
            hPct: 94,
            fillColor: '#FFCC00',
            fillOn: false,
            strokeColor: '#FFCC00',
            strokeW: 3,
            cornerPct: 0,
            rotationDeg: 0,
            opacity: 1,
            depth: 'front',
        });
    } else if (g.frame && dir?.special === 'border') {
        shapes.push({
            id: nid('frame'),
            kind: 'frame',
            xPct: 0.5,
            yPct: 0.5,
            wPct: 90,
            hPct: 93,
            fillColor: brandPrimary || g.frame.color,
            fillOn: false,
            strokeColor: brandPrimary || g.frame.color,
            strokeW: g.frame.strokeW,
            cornerPct: 0,
            rotationDeg: 0,
            opacity: g.frame.opacity,
            depth: 'front',
        });
    }

    // -- 7 · PHOTO TREATMENT — dim lifts as the photo brightens ----------------
    // The brief's energy biases the finishing: loud = deeper dim and
    // punchier grain (the newsstand read); quiet = air (the monograph
    // read). Clamped to the print-legal band either way.
    let bgDim = g.bgDim[0] + rng() * (g.bgDim[1] - g.bgDim[0]);
    if (dirEnergy === 'loud') bgDim += 0.04;
    else if (dirEnergy === 'quiet') bgDim -= 0.04;
    if (photoLight) bgDim = Math.min(0.34, bgDim + 0.08);
    bgDim = Math.max(0.04, Math.min(0.4, bgDim));
    const grainOpacity = Math.round(Math.min(0.45, g.grain[0] * (dirEnergy === 'loud' ? 1.3 : dirEnergy === 'quiet' ? 0.75 : 1)) * 1000) / 1000;

    const tags: string[] = [template];
    if (banner) tags.push('BANNER');
    if (isStatement) tags.push('STATEMENT');
    if (symmetric) tags.push('SYMMETRIC');

    return {
        theme: `${g.label} · ${tags.join(' · ')}`,
        style,
        // Machine tags — the §12.5 glass-pipeline trace reads these to show
        // WHICH realization of the direction was rolled this click.
        archetype: [
            ...tags,
            `BAND-${variantBand}`,
            dirScale ? `SCALE-${dirScale}` : '',
            dir ? `ENERGY-${dirEnergy}` : '',
        ]
            .filter(Boolean)
            .join(' · '),
        text,
        shapes,
        photo: {
            bgDim: Math.round(bgDim * 1000) / 1000,
            dimWholePhoto: g.dimWhole,
            photoFilter: dirPalette === 'mono' ? (photoLight ? 'mono' : 'noir') : dirPalette === 'duotone' ? 'vintage' : g.filter,
            grain: { enabled: true, opacity: grainOpacity, size: g.grain[1] },
        },
    };
}

export const SYSTEM_STYLE_LABELS: { id: SystemAutoStyle; label: string }[] = [
    { id: 'auto', label: 'AUTO' },
    ...(Object.keys(GENRES) as SystemStyleId[]).map((id) => ({ id, label: GENRES[id].label })),
];
