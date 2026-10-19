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
// ---------------------------------------------------------------------------

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
        photoFilter: 'none' | 'mono' | 'vintage' | 'noir';
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
        return {
            headroom: r2(top.calm),
            leftSpace: r2(left.calm),
            rightSpace: r2(right.calm),
            bottomSpace: r2(bottom.calm),
            photoLight,
            subjectX,
            hue: Math.round(vibe.hue),
            sat: r2(vibe.sat),
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
    filter: 'none' | 'mono' | 'vintage' | 'noir';
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
        railTexts: ['INDEPENDENT PRINT // TOKYO — LONDON — SEOUL', 'PRINTED MATTER — COLLECTORS EDITION'],
        badges: ['ARCHIVE 04 // TOKYO', 'HAND-NUMBERED EDITION'],
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
        dateline: ['EDITORIAL POSTER  |  SERIES {n} — TOKYO / BERLIN', 'SWISS CHRONICLE  |  FOLIO {n}'],
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
    // Blue / cool → natgeo (light) or cyber (dark)
    if (hue >= 210 && hue < 265) return photoLight ? 'natgeo' : 'cyber';
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
/** Greedy word-wrap with last-line balancing — how a print desk sets a
 *  slab: the column owns the width, the words wrap to the column. */
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
    if (lines.length >= 2) {
        const last = lines.length - 1;
        while (lines[last].length < lines[last - 1].length * 0.55) {
            const prev = lines[last - 1].split(' ');
            if (prev.length <= 1) break;
            const moved = prev.pop()!;
            lines[last - 1] = prev.join(' ');
            lines[last] = `${moved} ${lines[last]}`;
            if (lines[last].length > maxChars + 4) break;
        }
    }
    return lines;
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
export type DirectionTreatment = 'strip' | 'statement' | 'banner' | 'symmetric';

export interface ArtDirection {
    /** Which masthead system anchors the page (the anatomy's positions). */
    template?: DirectionTemplate;
    /** Which flank the coverline stack colonises. */
    cluster?: DirectionCluster;
    /** How the feature coverline is treated. */
    treatment?: DirectionTreatment;
    /** Which floor corner carries the barcode/QR. */
    scanCorner?: 'left' | 'right';
    /** Where the badge pill sits. */
    badgeSpot?: 'top' | 'cluster' | 'corner';
    /** Ask for the rotated spine rail instead of the dateline (quiet genres). */
    rail?: boolean;
}

export const ART_DIRECTION_MENU = {
    templates: ['TOP-MASTHEAD', 'SIDE-STRIP', 'DEEP-LAYER', 'VERTICAL', 'INVERTED'],
    clusters: ['left', 'right', 'center', 'split'],
    treatments: ['strip', 'statement', 'banner', 'symmetric'],
    scanCorners: ['left', 'right'],
    badgeSpots: ['top', 'cluster', 'corner'],
} as const;

/** Validate a raw (AI) direction object — every key checked against the
 *  live menus; unknown values are dropped, never trusted. An empty result
 *  means "no direction" and the deterministic fallback owns the solve. */
export function sanitizeArtDirection(raw: unknown): ArtDirection {
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
    if (typeof r.rail === 'boolean') out.rail = r.rail;
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
}): ComposedCover {
    const seed = (opts.seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const rng = mulberry32(seed);
    const a = opts.analysis ?? null;
    // VIBE MATCH: with a real photo analysis on the table, AUTO stops
    // gambling — the genre whose aesthetic fits the photo's measured colour
    // mood is the one that goes out (warm+saturated → FOOD, washed light →
    // KINFOLK, washed dark → NOIR, cool → NATGEO/CYBER, violet → DAZED…).
    const style: SystemStyleId = opts.style === 'auto' ? (a ? vibePick(a) : pickFrom(rng, AUTO_PICKS)) : opts.style;
    const g = GENRES[style];
    // Brand ink: the saved kit accent outranks the genre's accent in every
    // style — one hue of the user's brand on an otherwise ink/paper page.
    const brandAccent = opts.brand?.accent?.trim() ?? '';
    const photoLight = opts.photoLight ?? a?.photoLight ?? false;
    // The user's real content outranks the system's copy pools: the vibe
    // input and text already on the canvas fill the storytelling slots.
    const content = opts.content ?? {};
    // The AI art direction (already sanitized) — null means the
    // deterministic fallback owns every structural choice.
    const dir = opts.direction ?? null;

    // -- template selection: the photograph dictates the composition ---------
    const hasHeadroom = a ? a.headroom > 0.5 : rng() < 0.45;
    let calmSide: 'left' | 'right' = a ? (a.leftSpace >= a.rightSpace ? 'left' : 'right') : rng() < 0.5 ? 'left' : 'right';
    // Subject-mass tie-break: when both columns measure near-equally calm,
    // the stack colonises the flank OPPOSITE the subject — negative space
    // mirrors mass (the photograph dictates the composition, not the rng).
    if (a && Math.abs(a.leftSpace - a.rightSpace) < 0.06 && a.subjectX !== 'center') {
        calmSide = a.subjectX === 'left' ? 'right' : 'left';
    }
    const sideCalm = a ? Math.max(a.leftSpace, a.rightSpace) : 0.4 + rng() * 0.3;
    const bothCalm = a ? Math.min(a.leftSpace, a.rightSpace) : 0.25 + rng() * 0.3;

    // The hidden preset pool: an explicit library layout outranks the rng.
    const lib = opts.layoutId ? LAYOUT_LIBRARY.find((e) => e.id === opts.layoutId) : undefined;
    if (lib && (lib.cluster === 'left' || lib.cluster === 'right')) calmSide = lib.cluster;
    if (dir?.cluster === 'left' || dir?.cluster === 'right') calmSide = dir.cluster;

    type Template = 'TOP-MASTHEAD' | 'SIDE-STRIP' | 'DEEP-LAYER' | 'VERTICAL' | 'INVERTED';
    const roll = rng();
    let template: Template;
    if (dir?.template) template = dir.template;
    else if (roll < 0.06 && sideCalm > 0.3) template = 'VERTICAL'; // Position E — ELLE side-rail masthead
    else if (roll < 0.12) template = 'INVERTED'; // Position F — special-issue bottom masthead
    else if (hasHeadroom) template = 'TOP-MASTHEAD'; // classic over-head / sandwich
    else if (sideCalm > 0.42) template = 'SIDE-STRIP'; // the whitespace strategy
    else template = 'DEEP-LAYER'; // dense photo — sandwich + bottom strip
    if (!dir && lib) template = lib.template;

    const text: SystemTextSpec[] = [];
    const shapes: SystemShapeSpec[] = [];
    let stamp = 0;
    const nid = (p: string) => `sys-${p}-${stamp++}`;

    // Contrast pair — the ink-on-paper law, adapted to the photo's light.
    const PAPER = '#FFFFFF';
    const INK = '#000000';
    const plateFill = photoLight ? INK : PAPER;
    const plateInk = photoLight ? PAPER : INK;

    // BOLD GENRES: zine, dazed, cyber, gq, noir, vogue, vinyl, natgeo, time,
    // eye, bazaar, fragments. Determines plating, teaser count, badge style.
    const BOLD_GENRES: SystemStyleId[] = [
        'zine', 'dazed', 'cyber', 'gq', 'noir', 'vogue', 'vinyl',
        'natgeo', 'time', 'eye', 'bazaar', 'fragments',
    ];
    const isBoldGenre = BOLD_GENRES.includes(style);

    // -- 1 · MASTHEAD (hierarchy 10 — the brand's fixed identity) ------------
    const mastheadWidth = g.mastheadFont.widthPct[0] + rng() * (g.mastheadFont.widthPct[1] - g.mastheadFont.widthPct[0]);
    let mhX = 0.5;
    // Default yPct — pushed to mid-top so badge (0.06-0.09) and dateline
    // (0.07-0.12) each own their own band above the masthead.
    let mhY = 0.27 + rng() * 0.07;
    let mhWidth = Math.round(mastheadWidth);
    // Editorial standard: the masthead is automatically BEHIND the subject.
    let mhDepth: 'behind' | 'front' = 'behind';
    let mhRot = 0;

    if (template === 'TOP-MASTHEAD') {
        // Three clear bands: badge 0.06-0.09, dateline 0.09-0.13, masthead 0.26-0.34.
        // Nothing overlaps — the masthead sits in the upper-mid zone, not the
        // top-strip. With depth 'behind', it reads cleanly through the subject.
        mhY = 0.26 + rng() * 0.08;
        mhDepth = 'behind';
    } else if (template === 'SIDE-STRIP') {
        mhX = calmSide === 'left' ? 0.27 : 0.73;
        mhY = 0.2 + rng() * 0.05;
        mhWidth = Math.round(Math.min(mhWidth, 46 + Math.round(rng() * 6)));
        mhDepth = 'behind';
    } else if (template === 'VERTICAL') {
        mhRot = calmSide === 'left' ? -90 : 90;
        mhX = calmSide === 'left' ? 0.06 : 0.94;
        mhY = 0.44;
        mhWidth = 62;
        // Vertical spine masthead: behind the subject by default for deep editorial dimension
        mhDepth = 'behind';
    } else if (template === 'INVERTED') {
        mhY = 0.87;
        mhWidth = Math.round(Math.min(mhWidth, 84));
        mhDepth = 'front';
    }

    if (lib) {
        mhX = lib.mhX;
        // Never allow a library template to push TOP-MASTHEAD into the dateline/badge band
        mhY = template === 'TOP-MASTHEAD' ? Math.max(0.26, lib.mhY) : lib.mhY;
        mhWidth = Math.round(Math.min(mhWidth, lib.mhWidth));
    }

    text.push({
        id: 'box-masthead',
        text: content.masthead?.trim() || pickFrom(rng, g.mastheads),
        fontId: g.mastheadFont.fontId,
        weight: g.mastheadFont.weight,
        italic: g.mastheadFont.italic,
        caseMode: g.mastheadFont.caseMode ?? 'uppercase',
        fitToWidth: true,
        widthPct: mhWidth,
        heightPct: 16,
        letterSpacingEm: g.mastheadFont.tracking,
        color: style === 'kinfolk' ? '#F7F6F0' : PAPER,
        // The zine lesson: a 0.015em ink hairline on a behind-depth white
        // masthead keeps the word readable where the subject crosses it.
        strokeEm: mhDepth === 'behind' ? 0.015 : 0,
        strokeColor: INK,
        opacity: 1,
        rotationDeg: mhRot,
        depth: mhDepth,
        xPct: mhX,
        yPct: mhY,
    });

    // -- 2 · DATELINE (hierarchy 3, top band, machine voice) ------------------
    // Sits in the clear zone ABOVE the masthead.
    // Rail: rotated text down the edge (a genre signature for zine/vinyl etc.).
    // Dateline: short centered line just below the top margin.
    let useRail = lib
        // Bold genres NEVER use a vertical rail — the rotated edge text
        // competes with the masthead and clutters the cover regardless of
        // which library preset fires. Always fall through to dateline.
        ? !isBoldGenre && lib.micro === 'rail' && template !== 'VERTICAL'
        : template !== 'VERTICAL' && !isBoldGenre && (g.rail !== 'none' || rng() < 0.15);
    // The AI may explicitly ask for the spine rail (quiet genres only).
    if (dir && dir.rail !== undefined) useRail = dir.rail && !isBoldGenre && template !== 'VERTICAL';
    const railSide: 'left' | 'right' = g.rail !== 'none' && template !== 'SIDE-STRIP' ? g.rail : calmSide === 'left' ? 'right' : 'left';

    if (useRail) {
        const railText = content.rail?.trim() || fill(rng, pickFrom(rng, g.railTexts));
        text.push({
            id: 'box-rail',
            text: railText,
            fontId: g.microFont.fontId,
            weight: g.microFont.weight,
            caseMode: 'uppercase',
            fitToWidth: true,
            // Length-aware width — the rail's cap height lands at its design
            // size instead of ballooning fat on short lines.
            widthPct: microWidthForLine(railText.replace(/\s+/g, ' ').length, 2.3),
            heightPct: 2.4,
            letterSpacingEm: 0.14,
            color: PAPER,
            opacity: 0.82,
            rotationDeg: railSide === 'left' ? -90 : 90,
            depth: 'front',
            xPct: railSide === 'left' ? 0.055 : 0.945,
            // 0.44, not 0.5 — a full-length rail spans ±0.30 vertically;
            // starting at 0.44 pre-settles it clear of both the masthead's
            // band and the bottom stack in the separation pass.
            yPct: 0.44,
        });
    } else {
        const dateText = content.dateline?.trim() || fill(rng, pickFrom(rng, g.dateline));
        text.push({
            id: 'box-dateline',
            text: dateText,
            fontId: g.microFont.fontId,
            weight: g.microFont.weight,
            caseMode: 'uppercase',
            fitToWidth: true,
            // Length-aware width — a short dateline no longer stretches
            // fat across the page; its cap height lands near 1.9% of H.
            widthPct: microWidthForLine(dateText.replace(/\s+/g, ' ').length, 1.9),
            heightPct: 1.8,
            letterSpacingEm: 0.12,
            color: brandAccent || (g.accent && (style === 'natgeo' || style === 'cyber') ? g.accent : PAPER),
            opacity: 0.9,
            rotationDeg: 0,
            depth: 'front',
            xPct: 0.5,
            // The canonical top strip — the very first band of the page,
            // clear above the masthead's own band (0.16-0.20). The zine
            // anatomy: the dateline owns the edge, the masthead owns the sky.
            yPct: 0.055,
        });
    }

    // -- 3 · FEATURE COVERLINE + SUB + TEASER STACK ---------------------------
    // STANCE — who decides: the AI art direction (when the analyze round
    // trip returned one) > the library variant > the photo's measured crop >
    // the rng. Treatments: STRIP (the zine look — one wide tracked line
    // near the floor, unplated) · STATEMENT (dual-contrast plates over the
    // body) · BANNER (full-width special-issue strip) · SYMMETRIC (twin
    // columns).
    let banner = template !== 'VERTICAL' && template !== 'INVERTED' && template !== 'SIDE-STRIP'
        && rng() < (isBoldGenre ? 0.20 : 0.08);

    // The STATEMENT: a plated line crossing the subject.
    let isStatement = !banner && (
        (isBoldGenre && (template === 'TOP-MASTHEAD' || template === 'DEEP-LAYER') && rng() < 0.6) ||
        (template === 'DEEP-LAYER' && rng() < 0.4)
    );

    // SYMMETRIC columns (§5.3): both flanks calm → teasers split across the
    // opposite column while the feature cluster keeps its side.
    let symmetric = !banner && !isStatement && template === 'TOP-MASTHEAD' && bothCalm > 0.42 && rng() < 0.45;

    if (dir) {
        // THE AI IS THE ART DIRECTOR — its menu pick outranks pool and rng.
        banner = dir.treatment === 'banner' && template !== 'VERTICAL' && template !== 'INVERTED' && template !== 'SIDE-STRIP';
        isStatement = dir.treatment === 'statement' && template !== 'VERTICAL' && template !== 'INVERTED';
        symmetric = dir.treatment === 'symmetric' && template !== 'VERTICAL' && template !== 'INVERTED';
    } else if (lib) {
        banner = lib.variant === 'banner' && template !== 'VERTICAL' && template !== 'INVERTED' && template !== 'SIDE-STRIP';
        // Library 'statement' variant, OR bold genre on TOP-MASTHEAD plates.
        isStatement = !banner && (
            (lib.variant === 'statement' && template === 'DEEP-LAYER') ||
            (isBoldGenre && (template === 'TOP-MASTHEAD' || template === 'DEEP-LAYER'))
        );
        symmetric =
            !banner &&
            !isStatement &&
            (lib.variant === 'symmetric' || lib.cluster === 'split') &&
            template !== 'VERTICAL' &&
            template !== 'INVERTED';
    }

    // CROP-AWARE — the scan's floor decides the stance's home. A busy
    // bottom band cannot host an unplated strip, so the cluster lifts into
    // a plated statement over the body; a calm floor keeps the strip down
    // where the zine anatomy puts it. (bottomSpace finally earns its keep;
    // the veto also guards the AI's pick when the photo disagrees.)
    const bottomCalm = a ? a.bottomSpace : 0.4 + rng() * 0.3;
    if (!banner && !isStatement && template !== 'VERTICAL' && template !== 'INVERTED' && bottomCalm < 0.34) {
        isStatement = true;
    } else if (isStatement && !dir && bottomCalm > 0.62 && template === 'DEEP-LAYER' && rng() < 0.5) {
        isStatement = false;
    }

    const featureText = content.feature?.trim() || fill(rng, pickFrom(rng, g.features));
    const subText = content.sub?.trim() || fill(rng, pickFrom(rng, g.subs));

    // featureY: the vertical anchor for the plated cluster.
    // Bold genres: 0.76-0.79 = lower third, clear of the subject's body,
    // with room for the sub plate and barcode below.
    // Quiet genres: 0.80-0.82 = the traditional bottom-strip position.
    let featureY = isBoldGenre ? 0.76 + rng() * 0.03 : 0.80 + rng() * 0.02;
    let clusterX: number;
    let featureW: number;

    if (banner) {
        // Full-width strip: the plate is emitted in the ladder below, cut
        // to the feature's measured cap height.
        clusterX = 0.5;
        featureW = 88;
        featureY = 0.79;
    } else if (template === 'SIDE-STRIP' || (template === 'TOP-MASTHEAD' && sideCalm > 0.45)) {
        // Column stack — coverlines join the masthead's calm column. The
        // strip column runs DOWN from just under the masthead (0.62+), not
        // a lonely float at 0.70 — the stack fills the calm flank.
        clusterX = calmSide === 'left' ? 0.3 : 0.7;
        featureW = 42 + Math.round(rng() * 8);
        featureY = template === 'SIDE-STRIP' ? 0.62 + rng() * 0.06 : 0.79 + rng() * 0.02;
    } else if (template === 'DEEP-LAYER') {
        // Dense photo — bottom strip, centered, or a plated statement over the body.
        clusterX = 0.5;
        featureW = isStatement ? 52 + Math.round(rng() * 8) : 58 + Math.round(rng() * 12);
        featureY = isStatement ? 0.5 + rng() * 0.08 : 0.79 + rng() * 0.02;
    } else if (template === 'VERTICAL') {
        // Cluster opposite the vertical masthead's edge.
        clusterX = calmSide === 'left' ? 0.68 : 0.32;
        featureW = 44 + Math.round(rng() * 8);
    } else if (template === 'INVERTED') {
        clusterX = 0.42;
        featureW = 46 + Math.round(rng() * 8);
        featureY = 0.71;
    } else {
        // TOP-MASTHEAD fallback.
        // BOLD GENRES: always center the cluster so the plated block is
        // symmetrical and never clips the right or left edge.
        // QUIET GENRES: keep the diagonal placement for variety.
        if (isBoldGenre) {
            clusterX = 0.5;
            // Wide enough to feel like a full-bleed plate, narrow enough to
            // leave margin on both sides (centered ±36% = 14% margin each side).
            featureW = 70 + Math.round(rng() * 6); // 70-76%
        } else {
            clusterX = rng() < 0.5 ? 0.32 + rng() * 0.04 : 0.66 + rng() * 0.04;
            featureW = 44 + Math.round(rng() * 10);
        }
    }

    // The AI's cluster pick outranks the scan's default column (the banner
    // stance always owns the full width).
    if (dir && !banner && (dir.cluster === 'left' || dir.cluster === 'right' || dir.cluster === 'center')) {
        clusterX = dir.cluster === 'left' ? 0.3 : dir.cluster === 'right' ? 0.7 : 0.5;
    }
    if (dir?.cluster === 'split' && !banner && !isStatement) symmetric = true;

    // -- THE LADDER (§4) — measured, not guessed ------------------------------
    // The zine lesson: hierarchy is SCALE DRAMA. The masthead is colossal;
    // the feature is one confident line (strip) or a plated slab
    // (statement); the sub is a clear rung down; teasers whisper. Every
    // offset is computed from the same boxes the page-level guarantee
    // measures, so the stack lands ALREADY SETTLED — separation finds
    // nothing to move, and nothing here ever enters the scan corner's band.
    const featureLen = Math.max(6, featureText.replace(/\s+/g, ' ').trim().length);
    // STRIP = a WIDE CENTRED kicker (the zine lesson): one line sized to
    // its own length; the whole stack centres on its axis. Column stacks
    // belong to the statement anatomy.
    if (!isStatement && !banner) clusterX = 0.5;
    const featLayout = banner
        ? { text: featureText.replace(/\s+/g, ' ').trim(), h: capHeightForLine(featureLen, 92, 3.4, 5.2), maxLen: featureLen, lines: 1 }
        : isStatement
            ? layoutForColumn(featureText, featureW, 3.2, 8.2, 3)
            : { text: featureText.replace(/\s+/g, ' ').trim(), h: 4.2, maxLen: featureLen, lines: 1 };
    const featureH = featLayout.h;
    // Strips read as the zine kicker: low on the page, wide, one line.
    // INVERTED flips the rule: the masthead owns the floor band, so its
    // strip/banner sits ABOVE it instead of grazing it.
    if (!isStatement && !banner) featureY = Math.max(featureY, 0.78);
    if (template === 'INVERTED' && !isStatement) featureY = Math.min(featureY, 0.70);
    const subLayout = layoutForColumn(subText, Math.min(80, Math.max(30, featureW)), 1.8, 3.4, 3);
    const subH = round002(Math.min(featureH * 0.62, subLayout.h));
    const subLines = subLayout.text.split('\n').length;
    // Measured half-heights with the SAME leading (×1.12) the page's
    // measureTextBox uses for multi-line text — the guarantee measures
    // these exact boxes, so the stack lands already settled.
    const hhF = (featureH * 1.12 * featLayout.lines) / 200;
    const hhS = (subH * 1.12 * subLines) / 200;
    // The stack's floor — the barcode/QR band starts here and those shapes
    // carry their own text; text on them IS text on text (the loudest
    // rule). INVERTED's floor is higher: the masthead owns 0.79-0.95.
    const STACK_FLOOR = template === 'INVERTED' ? 0.76 : 0.872;

    // Keep the whole stack clear of the scan band (INVERTED: the low
    // masthead). If the sub cannot fit under the feature above the floor,
    // lift the FEATURE — the guarantee would otherwise resolve this
    // reactively, with uglier results.
    {
        const naturalSubY = featureY + hhF + 0.017 + hhS;
        const floorSubY = STACK_FLOOR - hhS;
        if (floorSubY < naturalSubY) {
            featureY = Math.max(0.30, floorSubY - hhF - 0.017 - hhS);
        }
    }
    let subY = featureY + hhF + 0.017 + hhS;
    let plateFH = 0;
    let plateSH = 0;
    let bannerH = 0;
    // Slab anchor(s): the cluster by default, edge-clamped once the
    // statement's measured plates exist (assigned in the isStatement
    // branch below). The words ride their plate — one axis, Gestalt L10.
    let plateFX = clusterX;
    let plateSX = clusterX;
    const trackF = g.kickerItalic ? 0.05 : 0.08;
    // Measured text boxes (fractions of canvas) — reCutPlates pads are
    // computed from THESE, so plates authored from the same numbers land
    // already flush and nothing re-cuts.
    const textHF = (featureH * 1.12 * featLayout.lines) / 100;
    const textWF = measureW(featLayout.maxLen, featureH, trackF, true) / 100;
    const textHS = (subH * 1.12 * subLines) / 100;
    const textWS = measureW(subLayout.maxLen, subH, 0.12, true) / 100;

    if (banner) {
        // Full-width special-issue strip — plate first (front shapes render
        // beneath front text), then the feature riding it, ONE teaser under.
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
        // DUAL CONTRAST PLATING — a wide slab behind the feature, an
        // inverted slab flush beneath the sub: the stacked-flag cluster of
        // couture covers. Geometry is authored to the SAME pads the page's
        // reCutPlates uses, so the slabs land already hugging their words —
        // authored geometry wins, nothing re-cuts, nothing moves.
        const featurePlateFill = photoLight ? INK : PAPER;
        const subPlateFill = photoLight ? PAPER : INK; // inverted from feature
        // reCutPlates' EXACT pad model: padX = max(0.035, textW×0.12),
        // padY = max(0.014, textH×0.38) — authored flush, never re-cut.
        const padYF = Math.max(0.014, textHF * 0.38);
        const padYS = Math.max(0.014, textHS * 0.38);
        plateFH = textHF + padYF * 2 + 0.004;
        plateSH = textHS + padYS * 2 + 0.004;
        // Guarantee-clean (≥ hhF+hhS+GAP 0.020) AND slab-flush — both hold.
        const subGap = Math.max(hhF + hhS + 0.022, plateFH / 2 + plateSH / 2 + 0.003);
        // The plated stack is TALL — lift the feature so the sub slab's
        // bottom never kisses the scan band (front plates would cover the
        // barcode). Authored clean beats guarantee-resolved clean.
        const stackBottom = subGap + (plateFH + plateSH) / 2;
        if (featureY + stackBottom > STACK_FLOOR) {
            featureY = Math.max(0.30, STACK_FLOOR - stackBottom);
        }
        subY = featureY + subGap;
        // Widths follow the column + the measured line, not the full page:
        // a left-cluster slab is a LEFT slab, not a full-width banner.
        const plateFW = Math.min(
            94,
            Math.max(30, Math.round((textWF + 2 * Math.max(0.035, textWF * 0.12)) * 100)),
        );
        const plateSW = Math.min(
            94,
            Math.max(30, Math.round((textWS + 2 * Math.max(0.035, textWS * 0.12)) * 100)),
        );
        // A left-cluster slab is a LEFT slab — but never past the edge:
        // both plate and its words shift in by the minimum that keeps the
        // slab inside [0.02, 0.98].
        plateFX = Math.min(0.98 - plateFW / 200, Math.max(0.02 + plateFW / 200, clusterX));
        plateSX = Math.min(0.98 - plateSW / 200, Math.max(0.02 + plateSW / 200, clusterX));
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
            depth: 'front',
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
            depth: 'front',
        });
    }

    // Determine the correct ink colours for the dual-plate system.
    // If isStatement: feature gets featurePlateInk, sub gets subPlateInk.
    // If banner: both get plateInk. If unplated: PAPER (visible on dark photo).
    const featureColor = isStatement
        ? (photoLight ? PAPER : INK)   // text on the feature plate (contrast to plate)
        : banner
            ? plateInk
            : PAPER;
    const subColor = isStatement
        ? (photoLight ? INK : PAPER)   // text on the sub plate (contrast to sub plate)
        : brandAccent || (g.accent && style === 'gq' ? g.accent : '#E8E8E8');

    text.push({
        id: 'box-feature',
        // Wrapped for statements (the print-desk slab); single line for
        // strip (a wide centred kicker — the zine lesson) and banner.
        text: featLayout.text,
        fontId: g.voiceFont.fontId,
        weight: g.voiceFont.weight,
        italic: g.kickerItalic && !isStatement && !banner,
        caseMode: g.kickerItalic && !isStatement && !banner ? 'original' : 'uppercase',
        // STRIP: fitToWidth with a LENGTH-aware width — short lines run
        // tall at the zine's wide kicker, long lines stay wide (≥56) so
        // the fitted cap height never collapses to a worm.
        // STATEMENT/BANNER: fixed cap height so slabs can be cut to fit.
        fitToWidth: !isStatement && !banner,
        widthPct: !isStatement && !banner
            ? Math.min(88, Math.max(56, microWidthForLine(featureLen, 4.2)))
            : featureW,
        heightPct: featureH,
        letterSpacingEm: g.kickerItalic ? 0.05 : 0.08,
        color: featureColor,
        opacity: 1,
        rotationDeg: 0,
        depth: 'front',
        xPct: isStatement ? plateFX : clusterX,
        yPct: featureY,
    });

    if (!banner && !(template === 'INVERTED' && !isStatement)) {
        // (INVERTED strip/banner: the masthead owns the floor band — a
        // sub squeezed between stack and masthead reads as clutter.)
        text.push({
            id: 'box-sub',
            // Sub wraps to the same column budget (max 2 lines) — a
            // 50-character sub is two dignified lines, not an overflow.
            text: subLayout.text,
            fontId: g.microFont.fontId,
            weight: Math.max(700, g.microFont.weight),
            caseMode: g.kickerItalic && !isStatement ? 'original' : 'uppercase',
            fitToWidth: false,
            widthPct: Math.max(20, featureW - 4),
            heightPct: subH,
            letterSpacingEm: 0.12,
            color: subColor,
            opacity: isStatement ? 1 : 0.85,
            rotationDeg: 0,
            depth: 'front',
            xPct: isStatement ? plateSX : clusterX,
            // One measured rung below the feature — plate-flush when plated,
            // airy when naked. Already settled: the guarantee finds nothing.
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
        : isStatement
            ? 1
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
                yPct: 0.42 + i * (symH / 100 + 0.017),
            });
        }
    }

    // -- 4 · BADGE (pill label — a single voice, one spot) ---------------------
    // The AI's badgeSpot outranks the default: 'top' = the zine pill in
    // the very top band (below the dateline when one lives there);
    // 'cluster' = riding the feature stack (the natgeo ribbon above the
    // story); 'corner' = opposite the text mass. INVERTED always keeps it
    // top-centre — the masthead owns the floor.
    if (template === 'INVERTED' || rng() < 0.55 || dir?.badgeSpot) {
        const spot: 'top' | 'cluster' | 'corner' =
            template === 'INVERTED' ? 'top' : dir?.badgeSpot ?? (isBoldGenre ? 'top' : 'corner');
        const featureTop = featureY - (isStatement ? plateFH / 2 : banner ? bannerH / 2 : hhF);
        const badgeY = spot === 'cluster'
            ? Math.max(0.1, featureTop - 0.029)
            // 'top' with a dateline in the strip sits just below it; with a
            // spine rail instead, the pill owns 0.08 (the zine position).
            : spot === 'top' ? (useRail ? 0.08 : 0.105) : 0.08;
        const badgeX = spot === 'top'
            ? 0.5
            : spot === 'cluster'
                ? clusterX
                : (clusterX < 0.5 ? 0.74 + rng() * 0.04 : 0.24 + rng() * 0.04);
        shapes.push({
            id: nid('badge'),
            kind: 'badge',
            xPct: badgeX,
            yPct: badgeY,
            wPct: isBoldGenre ? 38 + Math.round(rng() * 10) : 30 + Math.round(rng() * 8),
            hPct: 3.4,
            fillColor: PAPER,
            fillOn: true,
            strokeColor: INK,
            strokeW: 0,
            cornerPct: 0,
            rotationDeg: 0,
            opacity: 1,
            depth: 'front',
            label: (content.badge?.trim() || fill(rng, pickFrom(rng, g.badges))).toUpperCase().slice(0, 34),
        });
    }

    // -- 5 · SCAN — real EAN-13 barcode or scannable QR (folio band) ---------
    // Rule 13: the scan sits in the corner OPPOSITE the main text mass —
    // the AI's scanCorner pick outranks the genre default. A centered
    // mass (bottom-strip covers) falls back to the genre corner. INVERTED
    // lifts it above the bottom masthead.
    const clusterSide: 'left' | 'right' = dir?.scanCorner ?? (clusterX < 0.45 ? 'left' : clusterX > 0.55 ? 'right' : g.scanCorner);
    const scanX = clusterSide === 'left' ? 0.79 : 0.21;
    const useQr = g.preferQr && rng() < 0.45;
    const scanY = template === 'INVERTED' ? (useQr ? 0.79 : 0.82) : (useQr ? 0.885 : 0.915);
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
    if (g.frame) {
        shapes.push({
            id: nid('frame'),
            kind: 'frame',
            xPct: 0.5,
            yPct: 0.5,
            wPct: 90,
            hPct: 93,
            fillColor: g.frame.color,
            fillOn: false,
            strokeColor: g.frame.color,
            strokeW: g.frame.strokeW,
            cornerPct: 0,
            rotationDeg: 0,
            opacity: g.frame.opacity,
            depth: 'front',
        });
    }

    // -- 7 · PHOTO TREATMENT — dim lifts as the photo brightens ----------------
    let bgDim = g.bgDim[0] + rng() * (g.bgDim[1] - g.bgDim[0]);
    if (photoLight) bgDim = Math.min(0.34, bgDim + 0.08);

    const tags: string[] = [template];
    if (banner) tags.push('BANNER');
    if (isStatement) tags.push('STATEMENT');
    if (symmetric) tags.push('SYMMETRIC');

    return {
        theme: `${g.label} · ${tags.join(' · ')}`,
        style,
        archetype: tags.join(' · '),
        text,
        shapes,
        photo: {
            bgDim: Math.round(bgDim * 1000) / 1000,
            dimWholePhoto: g.dimWhole,
            photoFilter: g.filter,
            grain: { enabled: true, opacity: g.grain[0], size: g.grain[1] },
        },
    };
}

export const SYSTEM_STYLE_LABELS: { id: SystemAutoStyle; label: string }[] = [
    { id: 'auto', label: 'AUTO' },
    ...(Object.keys(GENRES) as SystemStyleId[]).map((id) => ({ id, label: GENRES[id].label })),
];
