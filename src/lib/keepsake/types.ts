import type * as THREE from 'three';

/**
 * Keepsake Diorama — shared types & art-directed palettes.
 *
 * Every palette fully determines the emotional character of the scene:
 * canopy gradients, fallen-petal carpet, undergrowth harmonization, cobble
 * temperature and even the sky blush. Nothing is a "generic green ground".
 */

export type KeepsakePresetId =
    | 'sakura'
    | 'wisteria'
    | 'rose'
    | 'ginkgo'
    | 'hydrangea'
    | 'frost'
    | 'bonsai';

export interface KeepsakePalette {
    id: KeepsakePresetId;
    name: string;
    /** Living canopy blossom/leaf tones (low → sunlit crown). */
    canopy: {
        deep: string;      // shadowed undersides
        secondary: string; // lower canopy
        primary: string;   // mid canopy mass
        highlight: string; // sun-kissed crown + rim light
    };
    /** Fallen petal carpet drifts. */
    petalCarpet: [string, string, string];
    /** Ground undergrowth harmonized with the canopy. */
    undergrowth: {
        clover: string;     // blush clover / amber tufts
        babyBreath: string; // tiny starry white blossoms
        moss: string;       // velvet moss cushions
        herb: string;       // micro-herbs / grass blades
        stem: string;       // wildflower stems
    };
    cobble: {
        base: string; // paver stone temperature
        moss: string; // velvet between grout lines
    };
    barkTint: string;
    sky: {
        zenith: string;
        horizon: string;
        floor: string;
    };
}

export const KEEPSAKE_PALETTES: Record<KeepsakePresetId, KeepsakePalette> = {
    sakura: {
        id: 'sakura',
        name: 'Sakura',
        canopy: {
            deep: '#c2417c',
            secondary: '#f472b6',
            primary: '#f9a8d4',
            highlight: '#fff1f7',
        },
        petalCarpet: ['#f9c5dd', '#f2a7c9', '#fce7f1'],
        undergrowth: {
            clover: '#eeb1cf',     // soft blush clover
            babyBreath: '#fdfdfd', // white baby's breath
            moss: '#7fa15f',       // velvet green cushions
            herb: '#9ec97f',
            stem: '#5f7a3f',
        },
        cobble: { base: '#cfc7b6', moss: '#8aa86b' },
        barkTint: '#6b4a35',
        sky: { zenith: '#fdf4e2', horizon: '#f8d9dd', floor: '#e8d9cf' },
    },
    rose: {
        id: 'rose',
        name: 'Velvet Rose',
        canopy: {
            deep: '#7f1d3a',
            secondary: '#b91c4c',
            primary: '#e11d48',
            highlight: '#ffcad2',
        },
        petalCarpet: ['#e0567a', '#c23358', '#f4a6b8'],
        undergrowth: {
            clover: '#d98ba0',
            babyBreath: '#fff8f2',
            moss: '#5f7f4a',
            herb: '#7d9b62',
            stem: '#4c6a38',
        },
        cobble: { base: '#c2b3a8', moss: '#7d9a6b' },
        barkTint: '#4f3a30',
        sky: { zenith: '#fdeecd', horizon: '#f6c9c2', floor: '#e3d0c6' },
    },
    ginkgo: {
        id: 'ginkgo',
        name: 'Golden Ginkgo',
        canopy: {
            deep: '#9a6a0e',
            secondary: '#d99b12',
            primary: '#f4c117',
            highlight: '#fdf1c0',
        },
        petalCarpet: ['#f2cc50', '#e0ab2a', '#f9e08a'],
        undergrowth: {
            clover: '#d9b64a',  // ochre tufts
            babyBreath: '#fdf6dd',
            moss: '#b98a2f',    // rich amber moss cushions
            herb: '#c8a94e',
            stem: '#8a7a2f',
        },
        cobble: { base: '#cabd9d', moss: '#a59544' },
        barkTint: '#7a6248',
        sky: { zenith: '#fdf3d7', horizon: '#f7dfa8', floor: '#e7dcc2' },
    },
    wisteria: {
        id: 'wisteria',
        name: 'Lavender Wisteria',
        canopy: {
            deep: '#5b3a8f',
            secondary: '#9d6ade',
            primary: '#b892e8',
            highlight: '#f1e6ff',
        },
        petalCarpet: ['#c9aef0', '#ab87dd', '#e6d4fa'],
        undergrowth: {
            clover: '#c3a3e3',
            babyBreath: '#fbf9ff',
            moss: '#7d9a6a',
            herb: '#93b57e',
            stem: '#5d7a4c',
        },
        cobble: { base: '#c6bfce', moss: '#88a276' },
        barkTint: '#5e4a44',
        sky: { zenith: '#f6efe2', horizon: '#e9d9f0', floor: '#ddd2ce' },
    },
    bonsai: {
        id: 'bonsai',
        name: 'Zen Bonsai',
        canopy: {
            deep: '#2f5024',
            secondary: '#48713a',
            primary: '#5c8a48',
            highlight: '#cfe3a8',
        },
        petalCarpet: ['#b9d29a', '#9dbd80', '#e2eec9'],
        undergrowth: {
            clover: '#a8c489',
            babyBreath: '#fdfdfd', // tiny white blossoms dotted on pads
            moss: '#6f8f52',
            herb: '#87a86b',
            stem: '#55703f',
        },
        cobble: { base: '#d2ccbc', moss: '#8fa872' },
        barkTint: '#5c4534',
        sky: { zenith: '#f7f1e0', horizon: '#eadfcc', floor: '#ded4c4' },
    },
    hydrangea: {
        id: 'hydrangea',
        name: 'Hydrangea Sky',
        canopy: {
            deep: '#2f5f9e',      // shadowed cornflower undersides
            secondary: '#4f86c6',
            primary: '#7fb0e0',   // billowing sky-blue mopheads
            highlight: '#e9f4fc', // white sunlit rims
        },
        petalCarpet: ['#8fb9e6', '#6c9cd4', '#d9ecf8'],
        undergrowth: {
            clover: '#9fc2d4',    // misty blue tufts
            babyBreath: '#f8fbff', // white florets scattered in the blue
            moss: '#7fa38e',      // cool sea-green cushions
            herb: '#a4c4ae',
            stem: '#5d8073',
        },
        cobble: { base: '#c4cad0', moss: '#89a598' }, // cool mist-grey pavers
        barkTint: '#584b42',
        sky: { zenith: '#f2f5ec', horizon: '#d6e4ee', floor: '#d8dcd9' },
    },
    frost: {
        id: 'frost',
        name: 'Winter Frost',
        canopy: {
            deep: '#93a9ba',      // pewter shadow
            secondary: '#c8d6e0',
            primary: '#eef3f7',   // winter-white crown
            highlight: '#ffffff', // pure silver rims
        },
        petalCarpet: ['#e6edf2', '#cfdae2', '#f8fbfd'],
        undergrowth: {
            clover: '#c7d5dc',    // silver tufts
            babyBreath: '#ffffff', // white edelweiss
            moss: '#a9bab4',      // frost-sage cushions
            herb: '#bacbc4',
            stem: '#849a93',
        },
        cobble: { base: '#dadad6', moss: '#aec0ba' }, // pale marble stone
        barkTint: '#6b635a',      // silver-grey bark
        sky: { zenith: '#f3f6f5', horizon: '#e2e9ec', floor: '#e0e3e2' },
    },
};

/** Plaque engraving copy. */
export interface PlaqueText {
    title: string;
    subtitle: string;
    signature?: string;
}

export interface KeepsakeConfig {
    presetId: KeepsakePresetId;
    seed: string;
    plaque: PlaqueText;
}

/** What every modular preset builder hands back to the assembler. */
export interface KeepsakePresetResult {
    group: THREE.Group;
    /** Angles (radians around trunk) where surface roots flare — the petal
     *  carpet drifts accumulate against these. */
    rootAngles: number[];
    /** Approximate canopy ground footprint radius for camera framing. */
    canopyFootprint: number;
    /** Top of canopy — used to frame the camera and particle ceiling. */
    canopyTopY: number;
}
