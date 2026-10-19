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

for (const d of dirs) {
    const out = composeSystemCover({ style: 'auto', seed: 12345, analysis: a, content, direction: d });
    console.log('\n=== direction', d === null ? 'NONE (fallback)' : JSON.stringify(d), '→ theme', out.theme, '| style', out.style);
    for (const t of out.text) {
        console.log(
            `  T ${t.id.padEnd(20)} "${String(t.text).slice(0, 34)}" x${t.xPct.toFixed(3)} y${t.yPct.toFixed(3)} w${t.widthPct.toFixed(1)} h${t.heightPct.toFixed(2)} fit=${t.fitToWidth ? 1 : 0} ${t.depth} rot${t.rotationDeg} fs${t.fontId}/${t.weight} ls${t.letterSpacingEm}`,
        );
    }
    for (const s of out.shapes) {
        console.log(
            `  S ${s.id.padEnd(20)} ${s.kind.padEnd(8)} x${s.xPct.toFixed(3)} y${s.yPct.toFixed(3)} w${s.wPct.toFixed(1)} h${s.hPct.toFixed(2)} ${s.depth}`,
        );
    }
}
