import { matchGenreToStyle, composeSystemCover, type PhotoAnalysis } from '../src/lib/magazine/cover-system';
import { diagnoseSituation, reconcile } from '../src/lib/magazine/brain';
import { scoreCandidate, type ElectCandidate, specBox } from '../src/lib/magazine/elect';
import { analyzeGridFromCanvas } from '../src/lib/magazine/solver';

console.log('--- 1. Testing matchGenreToStyle ---');
const genreTests: [string, string | null][] = [
    ['action sports & skate culture', 'zine'],
    ['streetwear & skate subculture', 'zine'],
    ['brutalist concrete ramp architecture', 'architectural'],
    ['high fashion couture runway', 'vogue'],
    ['cinematic film noir shadows', 'noir'],
    ['indie music vinyl record sleeve', 'vinyl'],
    ['quiet scandinavian slow living interior', 'kinfolk'],
    ['unknown alien spaceship', null],
];

for (const [input, expected] of genreTests) {
    const matched = matchGenreToStyle(input);
    if (matched !== expected) {
        console.error(`FAIL: matchGenreToStyle("${input}") => "${matched}", expected "${expected}"`);
        process.exit(1);
    }
}
console.log('PASS: All matchGenreToStyle test cases matched accurately.\n');

console.log('--- 2. Testing diagnoseSituation on Asymmetric Flanks (91% vs 48%) ---');
// Mock grid analysis for the skater photo
const mockGrid: any = {
    cols: 24,
    rows: 30,
    calm: new Float32Array(24 * 30),
    shelter: new Float32Array(24 * 30),
    light: false,
    subjectBox: { x0: 0.25, y0: 0.30, x1: 0.65, y1: 0.70 },
    subjectCore: { x0: 0.35, y0: 0.40, x1: 0.55, y1: 0.60 },
    colProfile: new Float32Array(24).fill(0.5),
};
// Fill calm field: 92% headroom, 48% left, 91% right, 36% bottom
for (let r = 0; r < 30; r++) {
    for (let c = 0; c < 24; c++) {
        const y = r / 30;
        const x = c / 24;
        let v = 0.5;
        if (y < 0.22) v = 0.92; // top
        else if (y > 0.78) v = 0.36; // bottom
        else if (x < 0.24) v = 0.48; // left
        else if (x > 0.76) v = 0.91; // right
        else v = 0.20; // center body
        mockGrid.calm[r * 24 + c] = v;
    }
}

const situation = diagnoseSituation(mockGrid);
console.log('Situation summary:', situation.summary);
const hasTwin = situation.findings.some(f => f.code === 'TWIN_FLANKS');
const hasAsym = situation.findings.some(f => f.code === 'ASYMMETRIC_FLANKS');
if (hasTwin) {
    console.error('FAIL: diagnoseSituation reported TWIN_FLANKS on 91% vs 48% asymmetric flanks!');
    process.exit(1);
}
if (!hasAsym) {
    console.error('FAIL: diagnoseSituation failed to report ASYMMETRIC_FLANKS on 91% vs 48% flanks!');
    process.exit(1);
}
console.log('PASS: Asymmetric flanks accurately diagnosed, twin flanks correctly suppressed.\n');

console.log('--- 3. Testing reconcile contradiction overrides ---');
const reconciled = reconcile(situation, [], {
    template: 'TOP-MASTHEAD',
    cluster: 'split',
    treatment: 'symmetric',
});
console.log('Reconciled cluster:', reconciled.direction.cluster, 'treatment:', reconciled.direction.treatment);
if (reconciled.direction.cluster === 'split' || reconciled.direction.treatment === 'symmetric') {
    console.error('FAIL: reconcile failed to veto split/symmetric on asymmetric flanks!');
    process.exit(1);
}
if (reconciled.direction.cluster !== 'right') {
    console.error(`FAIL: reconcile cluster should be 'right' (91% calm), got "${reconciled.direction.cluster}"`);
    process.exit(1);
}
console.log('PASS: Reconcile successfully redirected split/symmetric to the calmer right flank.\n');

console.log('--- 4. Testing composeSystemCover with Skater Photo inputs ---');
const analysis: PhotoAnalysis = {
    headroom: 0.92,
    leftSpace: 0.48,
    rightSpace: 0.91,
    bottomSpace: 0.36,
    subjectX: 'left',
    photoLight: false,
    hue: 195,
    sat: 0.35,
};

const composed = composeSystemCover({
    style: 'action sports & skate culture' as any,
    seed: 3875096488,
    analysis,
    content: {
        masthead: 'GRAVITY',
        dateline: 'VENICE • ISSUE 44 — €12',
        feature: 'THE WEIGHTLESS STATE',
        sub: 'Form, concrete, and the vertical limits of street motion',
        teasers: ['CONCRETE AS CANVAS', 'DRIFT: THE TOKYO LINE', 'AIR TIME ZERO'],
        badge: 'SPECIAL ISSUE • LIBERATION',
    },
    direction: {
        template: 'TOP-MASTHEAD',
        cluster: 'right',
        treatment: 'statement',
        mastheadDepth: 'front',
        mainLinePos: 'below-chin',
        palette: 'accent',
        special: 'none',
        scanCorner: 'left',
        badgeSpot: 'corner',
        rail: false,
        tone: 'paper',
        accent: '#734A35',
        mastheadScale: 'monumental',
        energy: 'quiet',
        mastheadRot: 'none',
    },
});

console.log('Theme:', composed.theme);
if (!composed.theme.startsWith('INDIE ZINE')) {
    console.error('FAIL: Expected theme starting with INDIE ZINE, got:', composed.theme);
    process.exit(1);
}

// Check plate width & position
const plates = composed.shapes.filter(s => s.id.includes('plate'));
for (const p of plates) {
    console.log(`Plate ${p.id}: x=${p.xPct.toFixed(3)}, w=${p.wPct.toFixed(1)}`);
    if (p.wPct > 54) {
        console.error(`FAIL: Side statement plate width exceeded 54%! wPct = ${p.wPct}`);
        process.exit(1);
    }
    if (p.xPct < 0.60) {
        console.error(`FAIL: Side statement plate pulled to center/left! xPct = ${p.xPct}`);
        process.exit(1);
    }
}

// Check barcode/qr collision
const scanShape = composed.shapes.find(s => s.kind === 'barcode' || s.kind === 'qr');
if (!scanShape) {
    console.error('FAIL: No barcode or QR code found in composed cover!');
    process.exit(1);
}
console.log(`Scan shape (${scanShape.kind}) at x=${scanShape.xPct}, y=${scanShape.yPct}, w=${scanShape.wPct}, h=${scanShape.hPct}`);

// Verify no text is inside scan bounding box
const bLeft = scanShape.xPct - scanShape.wPct / 200 - 0.01;
const bRight = scanShape.xPct + scanShape.wPct / 200 + 0.01;
const bTop = scanShape.yPct - scanShape.hPct / 200 - 0.01;
const bBottom = scanShape.yPct + scanShape.hPct / 200 + 0.01;

for (const t of composed.text) {
    const insideScan = t.xPct >= bLeft && t.xPct <= bRight && t.yPct >= bTop && t.yPct <= bBottom;
    if (insideScan) {
        console.error(`FAIL: Text "${t.text}" at x=${t.xPct}, y=${t.yPct} collided with ${scanShape.kind} envelope!`);
        process.exit(1);
    }
}
console.log(`PASS: ${scanShape.kind.toUpperCase()} is 100% free of text collisions.\n`);

// Check no centered text crossing skater at x=0.50
for (const t of composed.text) {
    if (t.id !== 'box-masthead' && t.id !== 'box-dateline') {
        if (Math.abs(t.xPct - 0.50) < 0.06 && t.yPct > 0.30 && t.yPct < 0.70) {
            console.error(`FAIL: Found text "${t.text}" at x=${t.xPct}, y=${t.yPct} crossing skater body!`);
            process.exit(1);
        }
    }
}
console.log('PASS: No coverline or teaser crosses skater in center corridor.\n');

console.log('--- 5. Testing elect.ts Subject Collision Penalty ---');
const candClean: ElectCandidate = {
    seed: 1,
    label: 'clean-right',
    boxes: [
        { id: 'box-masthead', text: 'GRAVITY', fitToWidth: true, widthPct: 88, heightPct: 16, xPct: 0.5, yPct: 0.11, hw: 0.44, hh: 0.08, depth: 'front' },
        { id: 'box-feature', text: 'WEIGHTLESS', fitToWidth: false, widthPct: 44, heightPct: 4.8, xPct: 0.74, yPct: 0.65, hw: 0.22, hh: 0.05, depth: 'front' },
    ],
};
const candDirty: ElectCandidate = {
    seed: 2,
    label: 'dirty-center',
    boxes: [
        { id: 'box-masthead', text: 'GRAVITY', fitToWidth: true, widthPct: 88, heightPct: 16, xPct: 0.5, yPct: 0.11, hw: 0.44, hh: 0.08, depth: 'front' },
        { id: 'box-feature', text: 'WEIGHTLESS', fitToWidth: false, widthPct: 44, heightPct: 4.8, xPct: 0.45, yPct: 0.50, hw: 0.22, hh: 0.05, depth: 'front' }, // Direct hit on skater core
    ],
};

const vClean = scoreCandidate(candClean, mockGrid);
const vDirty = scoreCandidate(candDirty, mockGrid);
console.log(`Clean candidate calm score: ${vClean.parts.calm.toFixed(3)}, total: ${vClean.total.toFixed(3)}`);
console.log(`Dirty candidate calm score: ${vDirty.parts.calm.toFixed(3)}, total: ${vDirty.total.toFixed(3)}`);

if (vDirty.parts.calm >= vClean.parts.calm) {
    console.error('FAIL: scoreCandidate failed to penalize candidate landing on subject!');
    process.exit(1);
}
console.log('PASS: scoreCandidate heavily penalizes text landing on subject core.\n');

console.log('=== ALL 5 ARCHITECTURAL FIXES VERIFIED 100% OPERATIONAL ===');
