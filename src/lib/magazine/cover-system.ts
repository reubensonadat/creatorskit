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
    | 'architectural';

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
}

export function analyzePhotoFromCanvas(cv: HTMLCanvasElement): PhotoAnalysis | null {
    try {
        const c = cv.getContext('2d', { willReadFrequently: true });
        if (!c) return null;
        const W = cv.width;
        const H = cv.height;
        if (!W || !H) return null;

        const region = (x0: number, y0: number, x1: number, y1: number): { calm: number; mean: number } => {
            const bx = Math.max(0, Math.floor(W * x0));
            const by = Math.max(0, Math.floor(H * y0));
            const bw = Math.max(1, Math.min(Math.floor(W * x1) - bx, W - bx));
            const bh = Math.max(1, Math.min(Math.floor(H * y1) - by, H - by));
            const d = c.getImageData(bx, by, bw, bh).data;
            let sum = 0;
            let n = 0;
            const lums: number[] = [];
            for (let i = 0; i < d.length; i += 64) {
                const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                lums.push(l);
                sum += l;
                n++;
            }
            if (!n) return { calm: 0.5, mean: 128 };
            const mean = sum / n;
            let varAcc = 0;
            for (const l of lums) varAcc += (l - mean) * (l - mean);
            const sd = Math.sqrt(varAcc / n);
            // Flat texture (sd 0) = fully calm; busy texture (sd ≥ 70) = dense.
            const calm = Math.max(0, Math.min(1, 1 - sd / 70));
            return { calm, mean };
        };

        const top = region(0, 0, 1, 0.18);
        const left = region(0, 0.18, 0.24, 0.72);
        const right = region(0.76, 0.18, 1, 0.72);
        const bottom = region(0, 0.74, 1, 0.94);
        const mid = region(0.24, 0.2, 0.76, 0.72);

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
};

const AUTO_PICKS: SystemStyleId[] = ['vogue', 'zine', 'kinfolk', 'noir', 'gq', 'dazed', 'natgeo', 'cyber', 'vinyl', 'architectural'];

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
}): ComposedCover {
    const seed = (opts.seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const rng = mulberry32(seed);
    const style: SystemStyleId = opts.style === 'auto' ? pickFrom(rng, AUTO_PICKS) : opts.style;
    const g = GENRES[style];
    const a = opts.analysis ?? null;
    const photoLight = opts.photoLight ?? a?.photoLight ?? false;
    // The user's real content outranks the system's copy pools: the vibe
    // input and text already on the canvas fill the storytelling slots.
    const content = opts.content ?? {};

    // -- template selection: the photograph dictates the composition ---------
    const hasHeadroom = a ? a.headroom > 0.5 : rng() < 0.45;
    let calmSide: 'left' | 'right' = a ? (a.leftSpace >= a.rightSpace ? 'left' : 'right') : rng() < 0.5 ? 'left' : 'right';
    const sideCalm = a ? Math.max(a.leftSpace, a.rightSpace) : 0.4 + rng() * 0.3;
    const bothCalm = a ? Math.min(a.leftSpace, a.rightSpace) : 0.25 + rng() * 0.3;

    // The hidden preset pool: an explicit library layout outranks the rng.
    const lib = opts.layoutId ? LAYOUT_LIBRARY.find((e) => e.id === opts.layoutId) : undefined;
    if (lib && (lib.cluster === 'left' || lib.cluster === 'right')) calmSide = lib.cluster;

    type Template = 'TOP-MASTHEAD' | 'SIDE-STRIP' | 'DEEP-LAYER' | 'VERTICAL' | 'INVERTED';
    const roll = rng();
    let template: Template;
    if (roll < 0.06 && sideCalm > 0.3) template = 'VERTICAL'; // Position E — ELLE side-rail masthead
    else if (roll < 0.12) template = 'INVERTED'; // Position F — special-issue bottom masthead
    else if (hasHeadroom) template = 'TOP-MASTHEAD'; // classic over-head / sandwich
    else if (sideCalm > 0.42) template = 'SIDE-STRIP'; // the whitespace strategy
    else template = 'DEEP-LAYER'; // dense photo — sandwich + bottom strip
    if (lib) template = lib.template;

    const text: SystemTextSpec[] = [];
    const shapes: SystemShapeSpec[] = [];
    let stamp = 0;
    const nid = (p: string) => `sys-${p}-${stamp++}`;

    // Contrast pair — the ink-on-paper law, adapted to the photo's light.
    const PAPER = '#FFFFFF';
    const INK = '#000000';
    const plateFill = photoLight ? INK : PAPER;
    const plateInk = photoLight ? PAPER : INK;

    // -- 1 · MASTHEAD (hierarchy 10 — the brand's fixed identity) ------------
    const mastheadWidth = g.mastheadFont.widthPct[0] + rng() * (g.mastheadFont.widthPct[1] - g.mastheadFont.widthPct[0]);
    let mhX = 0.5;
    let mhY = 0.17 + rng() * 0.1;
    let mhWidth = Math.round(mastheadWidth);
    let mhDepth: 'behind' | 'front' = 'behind';
    let mhRot = 0;

    if (template === 'TOP-MASTHEAD') {
        mhY = 0.165 + rng() * 0.035;
        // Calm headroom → the classic over-head masthead is legal; the
        // sandwich (behind) remains the house signature. Coin-flip it.
        mhDepth = rng() < 0.45 ? 'front' : 'behind';
    } else if (template === 'SIDE-STRIP') {
        // Whitespace strategy: masthead lives in the calm strip BESIDE the
        // subject, stacked smaller so the strip absorbs it.
        mhX = calmSide === 'left' ? 0.27 : 0.73;
        mhY = 0.2 + rng() * 0.05;
        mhWidth = Math.round(Math.min(mhWidth, 46 + Math.round(rng() * 6)));
        mhDepth = rng() < 0.5 ? 'front' : 'behind';
    } else if (template === 'VERTICAL') {
        // Position E — the masthead runs down the calm edge as a rail.
        mhRot = calmSide === 'left' ? -90 : 90;
        mhX = calmSide === 'left' ? 0.06 : 0.94;
        mhY = 0.44;
        mhWidth = 62;
        mhDepth = 'front';
    } else if (template === 'INVERTED') {
        // Position F — commemorative bottom masthead, photograph owns the top.
        mhY = 0.87;
        mhWidth = Math.round(Math.min(mhWidth, 84));
        mhDepth = 'front';
    }

    if (lib) {
        mhX = lib.mhX;
        mhY = lib.mhY;
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
        opacity: 1,
        rotationDeg: mhRot,
        depth: mhDepth,
        xPct: mhX,
        yPct: mhY,
    });

    // -- 2 · DATELINE (hierarchy 3, top band, machine voice) ------------------
    // A VERTICAL masthead already spends the one-rotation budget, so the
    // dateline stays horizontal; otherwise a genre rail (or seeded spine)
    // may carry it down an edge.
    const useRail = lib
        ? lib.micro === 'rail' && template !== 'VERTICAL'
        : template !== 'VERTICAL' && (g.rail !== 'none' || rng() < 0.22);
    // Rail edge: genre default, else the edge the masthead strip did NOT take.
    const railSide: 'left' | 'right' = g.rail !== 'none' && template !== 'SIDE-STRIP' ? g.rail : calmSide === 'left' ? 'right' : 'left';

    if (useRail) {
        text.push({
            id: 'box-rail',
            text: content.rail?.trim() || fill(rng, pickFrom(rng, g.railTexts)),
            fontId: g.microFont.fontId,
            weight: g.microFont.weight,
            caseMode: 'uppercase',
            fitToWidth: true,
            widthPct: 58 + Math.round(rng() * 12),
            heightPct: 2.4,
            letterSpacingEm: 0.14,
            color: PAPER,
            opacity: 0.82,
            rotationDeg: railSide === 'left' ? -90 : 90,
            depth: 'front',
            xPct: railSide === 'left' ? 0.055 : 0.945,
            yPct: 0.5,
        });
    } else {
        text.push({
            id: 'box-dateline',
            text: content.dateline?.trim() || fill(rng, pickFrom(rng, g.dateline)),
            fontId: g.microFont.fontId,
            weight: g.microFont.weight,
            caseMode: 'uppercase',
            fitToWidth: true,
            widthPct: 72 + Math.round(rng() * 12),
            heightPct: 1.8,
            letterSpacingEm: 0.1,
            color: g.accent && (style === 'natgeo' || style === 'cyber') ? g.accent : PAPER,
            opacity: 0.95,
            rotationDeg: 0,
            depth: 'front',
            xPct: 0.5,
            yPct: 0.075,
        });
    }

    // -- 3 · FEATURE COVERLINE + SUB + TEASER STACK ---------------------------
    // The BANNER: rare special-issue signal — a full-width ink-on-paper
    // strip carrying the feature line across the lower cover.
    let banner = template !== 'VERTICAL' && template !== 'INVERTED' && template !== 'SIDE-STRIP' && rng() < 0.08;

    // The STATEMENT: one plated line crossing the subject. Legal only on
    // dense photos (DEEP-LAYER) — and only ever ink-on-paper.
    let isStatement = !banner && template === 'DEEP-LAYER' && rng() < 0.4;

    // SYMMETRIC columns (§5.3): both flanks calm → teasers split across the
    // opposite column while the feature cluster keeps its side.
    let symmetric = !banner && !isStatement && template === 'TOP-MASTHEAD' && bothCalm > 0.42 && rng() < 0.45;

    if (lib) {
        banner = lib.variant === 'banner' && template !== 'VERTICAL' && template !== 'INVERTED' && template !== 'SIDE-STRIP';
        isStatement = !banner && lib.variant === 'statement' && template === 'DEEP-LAYER';
        symmetric =
            !banner &&
            !isStatement &&
            (lib.variant === 'symmetric' || lib.cluster === 'split') &&
            template !== 'VERTICAL' &&
            template !== 'INVERTED';
    }

    const featureText = content.feature?.trim() || fill(rng, pickFrom(rng, g.features));
    const subText = content.sub?.trim() || fill(rng, pickFrom(rng, g.subs));

    let featureY = 0.81 + rng() * 0.02;
    let clusterX: number;
    let featureW: number;

    if (banner) {
        // Full-width strip: plate first (front shapes render beneath front
        // text), then the feature riding it, then ONE teaser beneath.
        clusterX = 0.5;
        featureW = 90;
        featureY = 0.79;
        shapes.push({
            id: nid('banner'),
            kind: 'rect',
            xPct: 0.5,
            yPct: 0.79,
            wPct: 100,
            hPct: 4.4,
            fillColor: plateFill,
            fillOn: true,
            strokeColor: INK,
            strokeW: 0,
            cornerPct: 0,
            rotationDeg: 0,
            opacity: 0.98,
            depth: 'front',
        });
    } else if (template === 'SIDE-STRIP' || (template === 'TOP-MASTHEAD' && sideCalm > 0.45)) {
        // Column stack — coverlines join the masthead's calm column, below it.
        clusterX = calmSide === 'left' ? 0.3 : 0.7;
        featureW = 42 + Math.round(rng() * 8);
        featureY = template === 'SIDE-STRIP' ? 0.7 + rng() * 0.04 : 0.79 + rng() * 0.02;
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
        featureY = 0.72;
    } else {
        // TOP-MASTHEAD, balanced photo — corner cluster diagonal to the masthead.
        clusterX = rng() < 0.5 ? 0.32 + rng() * 0.04 : 0.66 + rng() * 0.04;
        featureW = 44 + Math.round(rng() * 10);
    }

    if (isStatement) {
        // The plate FIRST (front shapes render beneath front text — that
        // ordering IS the plating system), then the ink that sits on it.
        shapes.push({
            id: nid('plate-feature'),
            kind: 'rect',
            xPct: clusterX,
            yPct: featureY,
            wPct: featureW + 8,
            hPct: 3 + 1.6,
            fillColor: plateFill,
            fillOn: true,
            strokeColor: INK,
            strokeW: 0,
            cornerPct: 0,
            rotationDeg: 0,
            opacity: 0.97,
            depth: 'front',
        });
    }

    text.push({
        id: 'box-feature',
        text: featureText,
        fontId: g.voiceFont.fontId,
        weight: g.voiceFont.weight,
        italic: g.kickerItalic && !isStatement && !banner,
        caseMode: g.kickerItalic && !isStatement && !banner ? 'original' : 'uppercase',
        fitToWidth: false,
        widthPct: featureW,
        heightPct: banner ? 2.8 : 3,
        letterSpacingEm: g.kickerItalic ? 0.05 : 0.08,
        color: isStatement || banner ? plateInk : PAPER,
        opacity: 1,
        rotationDeg: 0,
        depth: 'front',
        xPct: clusterX,
        yPct: featureY,
    });

    if (!banner) {
        text.push({
            id: 'box-sub',
            text: subText,
            fontId: g.microFont.fontId,
            weight: Math.max(600, g.microFont.weight - 100),
            caseMode: g.kickerItalic ? 'original' : 'uppercase',
            fitToWidth: false,
            widthPct: Math.max(20, featureW - 4),
            heightPct: 1.8,
            letterSpacingEm: 0.12,
            color: isStatement ? PAPER : g.accent && style === 'gq' ? g.accent : '#E8E8E8',
            opacity: isStatement ? 0.95 : 0.85,
            rotationDeg: 0,
            depth: 'front',
            xPct: clusterX,
            yPct: featureY + 0.045,
        });
    }

    // -- 3b · TEASER STACK — the secondary coverline column (§5/§12) ----------
    // Hierarchy steps one rung at a time: weight 700 → 600, then opacity
    // 1 → 0.8. Each teaser is 25-40% of the masthead's cap height.
    const teaserPool = [
        ...(content.teasers || []).map((t) => t.trim()).filter(Boolean),
        ...shuffled(rng, g.teasers),
    ];
    const teaserCount = banner
        ? 1
        : isStatement
            ? 0
            : template === 'DEEP-LAYER'
                ? rng() < 0.5 ? 1 : 0
                : template === 'INVERTED'
                    ? 1 + Math.floor(rng() * 2)
                    : 1 + Math.floor(rng() * 3); // 1-3 stacked teasers

    const subBottom = featureY + 0.045 + 0.012;
    for (let i = 0; i < teaserCount && i < teaserPool.length; i++) {
        text.push({
            id: `box-teaser-${i + 1}`,
            text: fill(rng, teaserPool[i]),
            fontId: g.microFont.fontId,
            weight: 600,
            caseMode: g.kickerItalic && style === 'kinfolk' ? 'original' : 'uppercase',
            fitToWidth: false,
            widthPct: Math.max(18, featureW - 8),
            heightPct: 1.5,
            letterSpacingEm: 0.1,
            color: '#E8E8E8',
            opacity: 0.78,
            rotationDeg: 0,
            depth: 'front',
            xPct: clusterX,
            yPct: subBottom + 0.026 + i * 0.032,
        });
    }

    // SYMMETRIC split (§5.3): two teasers colonise the OPPOSITE calm column
    // at mid-height while the feature cluster keeps its own side.
    if (symmetric) {
        const oppX = clusterX < 0.5 ? 0.72 : 0.28;
        for (let i = 0; i < 2 && teaserPool.length > i; i++) {
            text.push({
                id: `box-teaser-sym-${i + 1}`,
                text: fill(rng, teaserPool[(i + 2) % teaserPool.length]),
                fontId: g.microFont.fontId,
                weight: 600,
                caseMode: 'uppercase',
                fitToWidth: false,
                widthPct: 30,
                heightPct: 1.5,
                letterSpacingEm: 0.1,
                color: PAPER,
                opacity: 0.82,
                rotationDeg: 0,
                depth: 'front',
                xPct: oppX,
                yPct: 0.42 + i * 0.038,
            });
        }
    }

    // -- 4 · BADGE (plate + label atom — the voice speaks once) --------------
    // INVERTED covers always carry one: Position F is a special-issue signal.
    if (template === 'INVERTED' || rng() < 0.6) {
        // Badge anchors the top corner OPPOSITE the text mass below.
        const badgeX = clusterX < 0.5 ? 0.72 + rng() * 0.06 : 0.26 + rng() * 0.06;
        shapes.push({
            id: nid('badge'),
            kind: 'badge',
            xPct: badgeX,
            yPct: 0.085,
            wPct: 26 + Math.round(rng() * 8),
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
    // Rule 13: the scan sits in the corner OPPOSITE the main text mass.
    // A centered mass (bottom-strip covers) falls back to the genre corner.
    const clusterSide: 'left' | 'right' = clusterX < 0.45 ? 'left' : clusterX > 0.55 ? 'right' : g.scanCorner;
    const scanX = clusterSide === 'left' ? 0.84 : 0.16;
    const useQr = g.preferQr && rng() < 0.45;
    if (useQr) {
        shapes.push({
            id: nid('qr'),
            kind: 'qr',
            xPct: scanX,
            yPct: 0.885,
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
            yPct: 0.94,
            wPct: 20,
            hPct: 6,
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
