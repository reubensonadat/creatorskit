// Dry-run the composer for every direction family — objective geometry
// check without a browser. Run: npx tsx scratch/direction-dryrun.ts
import {
    composeSystemCover,
    type PhotoAnalysis,
    type ArtDirection,
} from '../src/lib/magazine/cover-system';

const a: PhotoAnalysis = {
    headroom: 0.62,
    leftSpace: 0.71,
    rightSpace: 0.38,
    bottomSpace: 0.52,
    photoLight: true,
    subjectX: 'right',
    hue: 30,
    sat: 0.4,
};

const content = {
    masthead: 'LUMEN',
    dateline: 'PARIS • ISSUE 48 — €14.00',
    feature: 'THE QUIET LUXURY OF DOING NOTHING',
    sub: 'Why the new elite are trading hustle for stillness',
    teasers: ['SLOW CITY GUIDE', "THE LAST ARTISANS", "A READER'S LETTER"],
    badge: 'HOTELS SPECIAL',
    rail: 'Inside: the quiet luxury issue — hotels, artisans, and the art of doing nothing.',
};

const dirs: (ArtDirection | null)[] = [
    { template: 'SIDE-STRIP', cluster: 'left', treatment: 'statement', scanCorner: 'right', badgeSpot: 'top', rail: false },
    { template: 'TOP-MASTHEAD', cluster: 'right', treatment: 'strip', scanCorner: 'left', badgeSpot: 'corner', rail: true },
    { template: 'DEEP-LAYER', cluster: 'center', treatment: 'statement', scanCorner: 'right', badgeSpot: 'top', rail: false },
    { template: 'VERTICAL', cluster: 'right', treatment: 'strip', scanCorner: 'right', badgeSpot: 'top', rail: true },
    { template: 'INVERTED', cluster: 'split', treatment: 'banner', scanCorner: 'left', badgeSpot: 'top', rail: false },
    { template: 'SIDE-STRIP', cluster: 'left', treatment: 'symmetric', scanCorner: 'right', badgeSpot: 'cluster', rail: false },
    null,
];

console.log('\n=== SKATE PHOTO TEST: GQ style, vogue-deep-layer archetype, subject on right ===');
const skateOut = composeSystemCover({
    style: 'gq',
    seed: 42,
    analysis: {
        headroom: 0.35,
        leftSpace: 0.68,
        rightSpace: 0.28,
        bottomSpace: 0.45,
        photoLight: false,
        subjectX: 'right',
        hue: 200,
        sat: 0.3,
    },
    content: {
        masthead: 'VELOCITY',
        dateline: 'TOKYO • ISSUE 04 — $12.00',
        feature: 'GRAVITY DEFIED',
        sub: 'PUSHED TO THE ABSOLUTE EDGE OF URBAN ASPHALT',
        teasers: ['CONCRETE REEF', 'SPEED DISPATCH'],
    },
    direction: {
        template: 'DEEP-LAYER',
        cluster: 'left',
        treatment: 'editorial',
        scanCorner: 'right',
    },
    archetype: 'vogue-deep-layer',
});

console.log('Theme:', skateOut.theme);
for (const t of skateOut.text) {
    console.log(`  T ${t.id.padEnd(20)} "${String(t.text).slice(0, 34)}" x${t.xPct.toFixed(3)} y${t.yPct.toFixed(3)} w${t.widthPct.toFixed(1)} h${t.heightPct.toFixed(2)} depth=${t.depth} col=${t.color}`);
}
for (const s of skateOut.shapes) {
    console.log(`  S ${s.id.padEnd(20)} ${s.kind.padEnd(8)} x${s.xPct.toFixed(3)} y${s.yPct.toFixed(3)} w${s.wPct.toFixed(1)} h${s.hPct.toFixed(2)} depth=${s.depth} fill=${s.fillColor}`);
}


// ---------------------------------------------------------------------------
// NEW-AXIS DRY RUN — mastheadDepth / mainLinePos / palette / special (§4-§10)
// ---------------------------------------------------------------------------
const newDirs: { label: string; dir: ArtDirection | null; analysis?: PhotoAnalysis }[] = [
    { label: 'CELEBRITY SANDWICH (behind)', dir: { template: 'TOP-MASTHEAD', mastheadDepth: 'behind', cluster: 'left', treatment: 'editorial', mainLinePos: 'below-chin', scanCorner: 'right', badgeSpot: 'top' } },
    { label: 'MAIN LINE MID-SIDE', dir: { template: 'SIDE-STRIP', cluster: 'left', treatment: 'editorial', mainLinePos: 'side', scanCorner: 'right', badgeSpot: 'cluster' } },
    { label: 'MAIN LINE ABOVE-HEAD', dir: { template: 'TOP-MASTHEAD', mastheadDepth: 'front', cluster: 'left', treatment: 'editorial', mainLinePos: 'above-head', scanCorner: 'right', badgeSpot: 'top' } },
    { label: 'MAIN LINE BOTTOM + accent palette', dir: { template: 'TOP-MASTHEAD', cluster: 'center', treatment: 'editorial', mainLinePos: 'bottom', palette: 'accent', scanCorner: 'right', badgeSpot: 'top' } },
    { label: 'OVER-BODY mono + border (face-clamped)', dir: { template: 'DEEP-LAYER', mastheadDepth: 'behind', cluster: 'center', treatment: 'statement', mainLinePos: 'over-body', palette: 'mono', special: 'border', scanCorner: 'right', badgeSpot: 'top' } },
    { label: 'DENSE PHOTO (no dir — §8 overlay fallback)', dir: null, analysis: { headroom: 0.22, leftSpace: 0.24, rightSpace: 0.2, bottomSpace: 0.28, photoLight: false, subjectX: 'center', hue: 20, sat: 0.5 } },
];

for (const t of newDirs) {
    const out = composeSystemCover({
        style: 'vogue',
        seed: 7,
        analysis: t.analysis ?? a,
        content,
        direction: t.dir,
    });
    console.log(`\n--- ${t.label} --- ${out.theme}`);
    let bad = 0;
    for (const x of out.text) {
        const lines = String(x.text).split('\n').length;
        const hh = (x.heightPct * 1.12 * lines) / 200;
        const top = x.yPct - hh;
        const bot = x.yPct + hh;
        const flag = !Number.isFinite(x.xPct) || !Number.isFinite(x.yPct) || bot > 0.98 || top < 0 ? ' <<OUT' : '';
        if (flag) bad++;
        console.log(`  T ${x.id.padEnd(18)} "${String(x.text).replace(/\n/g, '/').slice(0, 26)}" y${x.yPct.toFixed(3)} bot${bot.toFixed(3)} h${x.heightPct.toFixed(2)}x${lines} col=${x.color}${flag}`);
    }
    for (const sh of out.shapes) {
        if (sh.id.includes('plate') || sh.id.includes('banner') || sh.id.includes('frame-special') || sh.kind === 'barcode' || sh.kind === 'qr' || sh.kind === 'badge') {
            console.log(`  S ${sh.id.padEnd(18)} ${sh.kind.padEnd(8)} x${sh.xPct.toFixed(3)} y${sh.yPct.toFixed(3)} w${sh.wPct.toFixed(1)} h${sh.hPct.toFixed(2)} label="${(sh.label || '').slice(0, 24)}" fill=${sh.fillColor}`);
        }
    }
    console.log(`  photoFilter=${out.photo.photoFilter} bad=${bad}`);
    if (bad) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// SOLVER PUSH — §5.5 bottom strip + §10 diagonal masthead
// ---------------------------------------------------------------------------
const pushDirs: { label: string; dir: ArtDirection }[] = [
    { label: 'BOTTOM STRIP teasers', dir: { template: 'TOP-MASTHEAD', cluster: 'center', treatment: 'editorial', mainLinePos: 'bottom', scanCorner: 'right', badgeSpot: 'top' } },
    { label: 'DIAGONAL masthead', dir: { template: 'TOP-MASTHEAD', mastheadDepth: 'front', cluster: 'left', treatment: 'editorial', special: 'diagonal', scanCorner: 'right', badgeSpot: 'top' } },
];
// ---------------------------------------------------------------------------
// LONG BADGE TEST — verify dynamic width, boundaries, and safe margins
// ---------------------------------------------------------------------------
console.log('\n=== LONG BADGE TEST ===');
const longBadgeOut = composeSystemCover({
    style: 'gq',
    seed: 99,
    analysis: a,
    content: {
        ...content,
        badge: 'THE AIRBORNE SKATEBOARDER SPECIAL EDITION',
    },
    direction: { template: 'TOP-MASTHEAD', cluster: 'left', treatment: 'editorial', scanCorner: 'right', badgeSpot: 'top' },
});
for (const sh of longBadgeOut.shapes) {
    if (sh.kind === 'badge') {
        console.log(`  Badge: label="${sh.label}" x=${sh.xPct.toFixed(3)} y=${sh.yPct.toFixed(3)} w=${sh.wPct.toFixed(1)} h=${sh.hPct.toFixed(2)}`);
        if (sh.wPct > 44) console.error('  ERROR: Badge exceeds max width limit of 44%!');
        if (sh.xPct - sh.wPct / 200 < 0.035 || sh.xPct + sh.wPct / 200 > 0.965) console.error('  ERROR: Badge clips outside margins!');
    }
}

// ---------------------------------------------------------------------------
// RECLINING HORIZONTAL PORTRAIT TEST (Exact user trace scenario)
// ---------------------------------------------------------------------------
console.log('\n=== RECLINING HORIZONTAL PORTRAIT TEST ===');
const reclinedAnalysis: PhotoAnalysis = {
    headroom: 0.88,
    leftSpace: 0.61,
    rightSpace: 0.0,
    bottomSpace: 0.84,
    subjectX: 'right',
    photoLight: false,
    pose: 'horizontal',
    hue: 0,
    sat: 0,
};

const reclinedOut = composeSystemCover({
    style: 'vogue',
    seed: 42,
    analysis: reclinedAnalysis,
    content: {
        masthead: 'VOGUE',
        dateline: 'PARIS • ISSUE 04 — €12.00',
        feature: 'THE SILENT ARCHIVE',
        sub: 'MONA IN MONOCHROME: THE SHADOWED REALM',
        teasers: ['STUDIO VOIDS', 'NEW MINIMALISM'],
        badge: 'SPECIAL ISSUE',
    },
    direction: {
        template: 'VERTICAL',
        cluster: 'center',
        treatment: 'strip',
        mastheadDepth: 'behind',
        mainLinePos: 'over-body', // Testing contradiction recovery
        mastheadRot: 'spine-left',
        scanCorner: 'right',
    },
});

console.log('Theme:', reclinedOut.theme);
for (const t of reclinedOut.text) {
    console.log(`  T ${t.id.padEnd(20)} "${String(t.text).slice(0, 36)}" x=${t.xPct.toFixed(3)} y=${t.yPct.toFixed(3)} w=${t.widthPct.toFixed(1)} h=${t.heightPct.toFixed(2)} rot=${t.rotationDeg}`);
}
for (const s of reclinedOut.shapes) {
    console.log(`  S ${s.id.padEnd(20)} ${s.kind.padEnd(8)} x=${s.xPct.toFixed(3)} y=${s.yPct.toFixed(3)} w=${s.wPct.toFixed(1)} h=${s.hPct.toFixed(2)} fill=${s.fillColor}`);
}

// Invariants check:
const hasPlates = reclinedOut.shapes.some(s => s.id.includes('plate'));
if (hasPlates) {
    console.error('ERROR: Unplated strip treatment generated statement plates!');
    process.exitCode = 1;
} else {
    console.log('SUCCESS: No ghost statement plates generated for unplated strip.');
}

const featText = reclinedOut.text.find(t => t.id === 'box-feature');
const subTextLayer = reclinedOut.text.find(t => t.id === 'box-sub');
if (featText && subTextLayer && subTextLayer.yPct <= featText.yPct) {
    console.error('ERROR: Subline is above or equal to feature headline!');
    process.exitCode = 1;
} else if (featText && subTextLayer) {
    console.log(`SUCCESS: Hierarchy preserved! Feature headline y=${featText.yPct.toFixed(3)} is above subline y=${subTextLayer.yPct.toFixed(3)}`);
}

const faceTeaser = reclinedOut.text.find(t => t.id.includes('sym') || (t.yPct > 0.35 && t.yPct < 0.65 && t.xPct < 0.40 && t.id.startsWith('box-teaser')));
if (faceTeaser) {
    console.error(`ERROR: Teaser collided into face zone! ${faceTeaser.id} at x=${faceTeaser.xPct}, y=${faceTeaser.yPct}`);
    process.exitCode = 1;
} else {
    console.log('SUCCESS: Face zone is completely clear of teaser collisions.');
}

console.log('\n=== SKATER IN SKY TEST: Action sports & skate culture with 91% right calm space ===');
const skateCultureOut = composeSystemCover({
    style: 'action sports & skate culture' as any,
    seed: 1333507254,
    analysis: {
        headroom: 0.92,
        leftSpace: 0.48,
        rightSpace: 0.91,
        bottomSpace: 0.36,
        photoLight: false,
        subjectX: 'left',
        hue: 195,
        sat: 0.35,
    },
    content: {
        masthead: 'ORBIT',
        dateline: 'VENICE • ISSUE 18 — €12',
        feature: 'THE WEIGHTLESS HORIZON',
        sub: 'DEFYING ARCHITECTURE AND GRAVITY UNDER HIGH PACIFIC SUN',
        teasers: ['CONCRETE GEOMETRY', 'VERT AND FORM', 'RISO WORKSHOP SPEC', 'NO ADS. EVER.'],
    },
    direction: {
        template: 'TOP-MASTHEAD',
        cluster: 'right',
        treatment: 'statement',
        mastheadDepth: 'front',
        mainLinePos: 'bottom',
        palette: 'accent',
        special: 'none',
        scanCorner: 'left',
        badgeSpot: 'corner',
        rail: false,
        tone: 'paper',
        mastheadScale: 'monumental',
        energy: 'quiet',
        mastheadRot: 'none',
    },
});

console.log('Skate Culture Theme:', skateCultureOut.theme);
if (!skateCultureOut.theme.startsWith('INDIE ZINE')) {
    console.error('ERROR: Semantic genre "action sports & skate culture" failed to map to zine! Got:', skateCultureOut.theme);
    process.exitCode = 1;
} else {
    console.log('SUCCESS: Semantic genre mapped accurately to INDIE ZINE.');
}

const featPlates = skateCultureOut.shapes.filter(s => s.id.includes('plate'));
for (const p of featPlates) {
    console.log(`  Plate ${p.id} x=${p.xPct} w=${p.wPct}`);
    if (p.xPct < 0.60) {
        console.error(`ERROR: Side cluster statement plate dragged to center or left! x=${p.xPct}`);
        process.exitCode = 1;
    }
}
if (featPlates.length > 0 && featPlates.every(p => p.xPct >= 0.60)) {
    console.log('SUCCESS: Statement plates stay cleanly anchored in right calm sky (x >= 0.60).');
}

const centerTeaser = skateCultureOut.text.find(t => Math.abs(t.xPct - 0.50) < 0.05 && t.yPct > 0.30 && t.yPct < 0.75);
if (centerTeaser) {
    console.error(`ERROR: Found teaser dropped at x=0.50 across subject! ${centerTeaser.id}: "${centerTeaser.text}" at y=${centerTeaser.yPct}`);
    process.exitCode = 1;
} else {
    console.log('SUCCESS: No teaser dropped in dead center across skater.');
}

