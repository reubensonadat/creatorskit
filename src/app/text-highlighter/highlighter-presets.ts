// Presets & corpus for the Text Highlighter engine.
// Deliberately SEPARATE from the Text Match Cut presets: the highlighter is a
// slow, cinematic journal sweep (longer multi-phrase anchors, academic paper
// styling), while match-cut is a rapid whip-cut montage that needs ≤23-char
// anchors so the camera can lock tight onto the same phrase across papers.
//
// Export names intentionally mirror the old import surface so pages can swap
// the module in one line.

import { NewspaperCut } from '@/lib/paper-graphics';

export interface PresetTopic {
    id: string;
    name: string;
    anchor: string;
    category: string;
    highlightColor: string;
    highlightStyle: 'marker' | 'underline' | 'box' | 'circle' | 'tape' | 'double-underline';
    paperTheme: 'vintage' | 'salmon' | 'tabloid' | 'dossier' | 'crisp' | 'noir' | 'academic';
    cuts: NewspaperCut[];
}

export const MASTHEADS = [
    'CREATOR RESEARCH LABS',
    'JOURNAL OF PRACTICAL DESIGN',
    'THE REVIEW OF EVERYDAY SYSTEMS',
    'ANNALS OF APPLIED CRAFT',
    'BULLETIN OF QUIET EXPERIMENTS',
    'TRANSACTIONS OF THE STUDIO INSTITUTE',
    'QUARTERLY OF DIGITAL MEDIA STUDIES',
];

export const SUBHEADS = [
    'Keywords  Workflow • Automation • Visual Media',
    'Peer-reviewed under double-blind conditions',
    'Findings replicated across three independent studios',
    'Corresponding author available on request',
    'Dataset and stimuli published alongside the paper',
    'Funding disclosed; no competing interests declared',
];

export const LOCATIONS = [
    'SAN FRANCISCO',
    'CAMBRIDGE',
    'BOSTON',
    'ZURICH',
    'KYOTO',
    'TORONTO',
];

export const BYLINES = [
    'Published online by the Studio Institute',
    'Received 12 October; accepted 24 December',
    'DOI 10.1984/ckit.2026.0114',
    'Preprint v3 — revised after peer review',
    'From the Department of Media Systems',
];

export const BODY_CORPUS = [
    `The empirical study evaluates multi-track timeline processing across four hundred creator workflows. Results indicate that neural spatial filters reduce manual rotoscoping overhead by over eighty percent without loss of edge sharpness. Participants reported lower cognitive load during editing sessions, and follow-up interviews confirmed sustained preference for the assisted pipeline over traditional manual techniques after the trial period concluded.`,
    `Observational data were collected over eighteen months across distributed production teams. The analysis controls for project complexity, team seniority, and platform variance. Marginal gains compound in longer productions: a two-minute deliverable saved eleven minutes on average, while a twenty-minute deliverable saved over two hours. No statistically significant quality regression was detected by the review panel.`,
    `The methodology follows established conventions in applied media research. All stimuli were randomized, all render passes were logged, and inter-rater agreement exceeded the pre-registered threshold. Limitations include sample composition skewed toward technical creators and the absence of longitudinal retention measures beyond the study window.`,
    `Discussion centers on a modest but consistent effect: small reductions in friction accumulate into meaningful changes in creative behavior. Participants iterated more often, abandoned fewer projects, and reported higher satisfaction with final deliverables. The authors recommend replication in non-technical populations before broader generalization is attempted.`,
];

/**
 * Generates journal-style abstracts for any phrase — the phrase is embedded
 * naturally so the highlighter sweep has real prose to travel through.
 */
export function generateCutsForPhrase(phrase: string, count = 3): NewspaperCut[] {
    const clean = phrase.trim() || 'creator workflows';
    const segments = clean.split(/[|\n]+/).map((s) => s.trim()).filter(Boolean);
    const joined = segments.join(' and ') || clean;

    const templates = [
        `Abstract Modern creative practice increasingly treats ${joined} as a core production discipline rather than an optional refinement. This paper examines how the shift reshapes daily workflow, budgeting, and long-term project sustainability across independent studios and small teams.`,
        `Abstract We present an eighteen-month observational study of ${joined} in working production environments. Participants reported measurable reductions in friction, and follow-up interviews confirmed sustained behavioral changes well beyond the initial trial period.`,
        `Abstract The central claim of this review is that ${joined} now determines outcomes earlier in the pipeline than traditional craft skills. Evidence from four hundred logged workflows supports the hypothesis with moderate to strong effect sizes.`,
        `Abstract Despite growing adoption, ${joined} remains poorly documented in applied literature. This paper contributes a structured taxonomy, a replicable protocol, and a candid account of failure modes observed across independent creator teams.`,
        `Abstract Findings suggest that ${joined} interacts with tooling choices in ways previously underestimated. The implications for training, hiring, and studio economics are discussed alongside limitations and directions for future work.`,
        `Abstract This longitudinal analysis tracks ${joined} from niche technique to industry default. Adoption curves, practitioner interviews, and platform telemetry converge on the same conclusion: the transition is structural, not stylistic.`,
    ];

    const shuffled = [...templates].sort(() => Math.random() - 0.5);
    const shuffledMastheads = [...MASTHEADS].sort(() => Math.random() - 0.5);
    const shuffledSubheads = [...SUBHEADS].sort(() => Math.random() - 0.5);
    const shuffledLocations = [...LOCATIONS].sort(() => Math.random() - 0.5);
    const shuffledBylines = [...BYLINES].sort(() => Math.random() - 0.5);

    const cuts: NewspaperCut[] = [];
    const year = 2026;

    for (let i = 0; i < count; i++) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const month = months[(i * 3 + 1) % 12];
        const day = 4 + ((i * 7) % 22);
        const vol = 12 + (i % 4);
        const issue = 340 + i * 27;

        cuts.push({
            id: `hl-cut-${Date.now()}-${i + 1}`,
            masthead: shuffledMastheads[i % shuffledMastheads.length],
            subhead: shuffledSubheads[i % shuffledSubheads.length],
            headline: shuffled[i % shuffled.length].replace('Abstract ', 'Abstract  '),
            byline: shuffledBylines[i % shuffledBylines.length],
            location: shuffledLocations[i % shuffledLocations.length],
            bodyParagraphs: [
                BODY_CORPUS[i % BODY_CORPUS.length],
                BODY_CORPUS[(i + 2) % BODY_CORPUS.length],
            ],
            dateString: `Vol. ${vol}, No. ${issue} • ${month} ${day}, ${year}`,
            columnCount: 1,
            rotationOffset: 0,
        });
    }

    return cuts;
}

export const PRESET_TOPICS: PresetTopic[] = [
    {
        id: 'creator-research',
        name: 'Research Journal',
        anchor: '10x faster turnaround times | neural depth rendering',
        category: 'Academic Journal',
        highlightColor: '#ff6b81', // Authentic Journal Coral Highlighter
        highlightStyle: 'marker',
        paperTheme: 'academic',
        cuts: [
            {
                id: 'creator-res-1',
                masthead: 'CREATOR RESEARCH LABS',
                subhead: 'Keywords  Video Production • Neural Depth • Workflow Automation',
                headline:
                    'Abstract Modern video production workflows achieve 10x faster turnaround times when integrating automated scene detection and neural depth rendering. Benchmarks demonstrate that creators save over fifteen hours per project while retaining full cinematic color fidelity.',
                byline: 'Published online: January 14, 2026',
                location: 'SAN FRANCISCO',
                bodyParagraphs: [
                    'The empirical study evaluates multi-track timeline processing across four hundred creator workflows. Results indicate that neural spatial filters reduce manual rotoscoping overhead by over eighty percent without loss of edge sharpness.',
                ],
                dateString: 'January 14, 2026',
                columnCount: 1,
                rotationOffset: 0,
            },
        ],
    },
    {
        id: 'friction-diary',
        name: 'Everyday Systems',
        anchor: 'small reductions in friction | accumulate into meaningful changes',
        category: 'Behavioral Research',
        highlightColor: '#00F0FF',
        highlightStyle: 'underline',
        paperTheme: 'crisp',
        cuts: [
            {
                id: 'friction-1',
                masthead: 'THE REVIEW OF EVERYDAY SYSTEMS',
                subhead: 'Peer-reviewed under double-blind conditions',
                headline:
                    'Abstract The central finding of this review is that small reductions in friction accumulate into meaningful changes in creative behavior. Participants iterated more often, abandoned fewer projects, and reported higher satisfaction with final deliverables over the full study window.',
                byline: 'DOI 10.1984/ckit.2026.0114',
                location: 'CAMBRIDGE',
                bodyParagraphs: [BODY_CORPUS[3]],
                dateString: 'Vol. 14, No. 388 • May 21, 2026',
                columnCount: 1,
                rotationOffset: 0,
            },
        ],
    },
];
