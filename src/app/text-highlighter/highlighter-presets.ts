// Presets & corpus for the Text Highlighter engine.
// Deliberately SEPARATE from the Text Match Cut presets: the highlighter is a
// slow, cinematic journal sweep (longer multi-phrase anchors, academic paper
// styling), while match-cut is a rapid whip-cut montage that needs ≤23-char
// anchors so the camera can lock tight onto the same phrase across papers.
//
// The TOPIC LINEUP mirrors the match-cut studio (Red Flags, AI-generated code,
// Studio Space Planner, etc.) but every cut is rewritten in
// journal-abstract prose so the slow marker sweep has real text to travel
// through — the same subjects, told in the highlighter's voice.
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
export function generateCutsForPhrase(phrase: string, count = 6): NewspaperCut[] {
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
        `Abstract We test whether ${joined} survives contact with real production deadlines. Across nine studios and one hundred twelve deliverables, the answer was consistent: teams that internalized the practice shipped earlier and revised less.`,
        `Abstract A survey of two thousand working creators ranks ${joined} among the three most consequential changes to their pipeline in the last five years. We unpack why the perceived value compounds with experience rather than decaying.`,
        `Abstract The replication study revisits earlier claims about ${joined} under stricter controls. Core effects held; several celebrated shortcuts did not. We publish the full log so other teams can repeat the analysis line by line.`,
        `Abstract Cost records, render telemetry, and editor diaries are triangulated to price ${joined} precisely. The break-even point arrives earlier than industry folklore predicts, provided adoption is paired with deliberate workflow redesign.`,
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
            {
                id: 'creator-res-2',
                masthead: 'TRANSACTIONS OF THE STUDIO INSTITUTE',
                subhead: 'Findings replicated across three independent studios',
                headline:
                    'Abstract Across four hundred logged productions, teams that committed early to neural depth rendering reported 10x faster turnaround times than matched manual pipelines. The gains persist after controlling for project length, crew size, and platform variance.',
                byline: 'Received 12 October; accepted 24 December',
                location: 'CAMBRIDGE',
                bodyParagraphs: [BODY_CORPUS[1]],
                dateString: 'Vol. 13, No. 367 • March 9, 2026',
                columnCount: 1,
                rotationOffset: 0,
            },
            {
                id: 'creator-res-3',
                masthead: 'ANNALS OF APPLIED CRAFT',
                subhead: 'Dataset and stimuli published alongside the paper',
                headline:
                    'Abstract Automated scene detection paired with neural depth rendering delivered 10x faster turnaround times in a controlled benchmark of independent studios, with blind reviewers confirming no measurable loss in cinematic color fidelity.',
                byline: 'DOI 10.1984/ckit.2026.0114',
                location: 'ZURICH',
                bodyParagraphs: [BODY_CORPUS[0]],
                dateString: 'Vol. 14, No. 394 • June 18, 2026',
                columnCount: 1,
                rotationOffset: 0,
            },
            {
                id: 'creator-res-4',
                masthead: 'QUARTERLY OF DIGITAL MEDIA STUDIES',
                subhead: 'Funding disclosed; no competing interests declared',
                headline:
                    'Abstract The economics are now unambiguous: studios that integrate neural depth rendering into final assembly observe 10x faster turnaround times within a single quarter, and the pipeline pays for itself before the second project ships.',
                byline: 'From the Department of Media Systems',
                location: 'KYOTO',
                bodyParagraphs: [BODY_CORPUS[3]],
                dateString: 'Vol. 15, No. 421 • November 2, 2026',
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
            {
                id: 'friction-2',
                masthead: 'BULLETIN OF QUIET EXPERIMENTS',
                subhead: 'Corresponding author available on request',
                headline:
                    'Abstract Across eighteen months of observation the pattern repeated in every team we followed: small reductions in friction accumulate into meaningful changes in creative behavior, visible first as more iteration and later as fewer abandoned drafts.',
                byline: 'Received 12 October; accepted 24 December',
                location: 'BOSTON',
                bodyParagraphs: [BODY_CORPUS[2]],
                dateString: 'Vol. 12, No. 345 • February 27, 2026',
                columnCount: 1,
                rotationOffset: 0,
            },
            {
                id: 'friction-3',
                masthead: 'JOURNAL OF PRACTICAL DESIGN',
                subhead: 'Findings replicated across three independent studios',
                headline:
                    'Abstract We test the hypothesis at the portfolio level rather than the task level and confirm that small reductions in friction accumulate into meaningful changes: aggregate output rose nineteen percent while reported effort fell.',
                byline: 'Published online by the Studio Institute',
                location: 'TORONTO',
                bodyParagraphs: [BODY_CORPUS[1]],
                dateString: 'Vol. 13, No. 372 • August 30, 2026',
                columnCount: 1,
                rotationOffset: 0,
            },
            {
                id: 'friction-4',
                masthead: 'THE REVIEW OF EVERYDAY SYSTEMS',
                subhead: 'Peer-reviewed under double-blind conditions',
                headline:
                    'Abstract The longitudinal data support a simple mechanical claim: small reductions in friction accumulate into meaningful changes once creators stop rationing their own iteration and start testing ideas the day they arrive.',
                byline: 'Preprint v3 — revised after peer review',
                location: 'CAMBRIDGE',
                bodyParagraphs: [BODY_CORPUS[3]],
                dateString: 'Vol. 16, No. 448 • December 7, 2026',
                columnCount: 1,
                rotationOffset: 0,
            },
        ],
    },
    {
        id: 'red-flags-review',
        name: 'Red Flags Review',
        anchor: 'red flags',
        category: 'Audit & Risk',
        highlightColor: '#FFE500',
        highlightStyle: 'marker',
        paperTheme: 'dossier',
        cuts: [
            {
                id: 'rf-r-1',
                masthead: 'TRANSACTIONS OF THE STUDIO INSTITUTE',
                subhead: 'Keywords  Risk • Governance • Post-Mortem Analysis',
                headline:
                    'Abstract The post-mortem is unambiguous: red flags were documented, dated, and distributed fourteen weeks before the failure, yet no escalation path was ever triggered. We reconstruct the decision chain and propose structural fixes for review boards that mistake silence for consensus.',
                byline: 'Received 12 October; accepted 24 December',
                location: 'ZURICH',
                bodyParagraphs: [BODY_CORPUS[2]],
                dateString: 'Vol. 13, No. 361 • March 14, 2026',
                columnCount: 1,
                rotationOffset: 0,
            },
            {
                id: 'rf-r-2',
                masthead: 'ANNALS OF APPLIED CRAFT',
                subhead: 'Dataset and stimuli published alongside the paper',
                headline:
                    'Abstract We audit forty licensing deals against a published risk taxonomy and find that red flags cluster around three clauses standard templates treat as boilerplate. Ninety percent of the losses in our sample trace back to those clauses alone.',
                byline: 'DOI 10.1984/ckit.2026.0114',
                location: 'BOSTON',
                bodyParagraphs: [BODY_CORPUS[1]],
                dateString: 'Vol. 12, No. 342 • January 23, 2026',
                columnCount: 1,
                rotationOffset: 0,
            },
            {
                id: 'rf-r-3',
                masthead: 'QUARTERLY OF DIGITAL MEDIA STUDIES',
                subhead: 'Corresponding author available on request',
                headline:
                    'Abstract Whistleblower filings show that internal red flags were relabeled as observations before reaching the board — a semantic downgrade that removed them from mandatory review. The paper proposes flag-preserving language for compliance reporting.',
                byline: 'From the Department of Media Systems',
                location: 'KYOTO',
                bodyParagraphs: [BODY_CORPUS[3]],
                dateString: 'Vol. 14, No. 402 • July 6, 2026',
                columnCount: 1,
                rotationOffset: 0,
            },
            {
                id: 'rf-r-4',
                masthead: 'BULLETIN OF QUIET EXPERIMENTS',
                subhead: 'Peer-reviewed under double-blind conditions',
                headline:
                    'Abstract Behavioral data from review committees explain why red flags go unheeded: each warning arrives embedded in routine paperwork and no participant ever sees the full set. Aggregation, not courage, was the missing mechanism.',
                byline: 'Published online by the Studio Institute',
                location: 'SAN FRANCISCO',
                bodyParagraphs: [BODY_CORPUS[0]],
                dateString: 'Vol. 15, No. 429 • October 19, 2026',
                columnCount: 1,
                rotationOffset: 0,
            },
        ],
    },
    {
        id: 'ai-code-audit',
        name: 'AI Code Audit',
        anchor: 'AI-generated code',
        category: 'Security Research',
        highlightColor: '#FFE500',
        highlightStyle: 'marker',
        paperTheme: 'noir',
        cuts: [
            {
                id: 'ai-a-1',
                masthead: 'CREATOR RESEARCH LABS',
                subhead: 'Keywords  Software Security • Benchmarking • Static Analysis',
                headline:
                    'Abstract A benchmark of forty thousand generation tasks across four languages finds that AI-generated code introduces 1.7 times more syntax errors, logic regressions, and memory vulnerabilities than matched human output. The speed gains were real; so was every class of defect.',
                byline: 'Received 12 October; accepted 24 December',
                location: 'SAN FRANCISCO',
                bodyParagraphs: [BODY_CORPUS[2]],
                dateString: 'Vol. 13, No. 358 • February 16, 2026',
                columnCount: 1,
                rotationOffset: 0,
            },
            {
                id: 'ai-a-2',
                masthead: 'TRANSACTIONS OF THE STUDIO INSTITUTE',
                subhead: 'Findings replicated across three independent studios',
                headline:
                    'Abstract Static analysis of merged pull requests shows AI-generated code skipping boundary checks and edge-case validation at more than twice the human rate. We recommend mandatory review gates before any AI-assisted change reaches production.',
                byline: 'DOI 10.1984/ckit.2026.0114',
                location: 'CAMBRIDGE',
                bodyParagraphs: [BODY_CORPUS[1]],
                dateString: 'Vol. 12, No. 349 • April 3, 2026',
                columnCount: 1,
                rotationOffset: 0,
            },
            {
                id: 'ai-a-3',
                masthead: 'JOURNAL OF PRACTICAL DESIGN',
                subhead: 'Corresponding author available on request',
                headline:
                    'Abstract We trace a nine-hour production outage to AI-generated code that hallucinated a deprecated API contract. The patch passed every automated test; the failure mode was structural rather than syntactic, and invisible to current tooling.',
                byline: 'From the Department of Media Systems',
                location: 'TORONTO',
                bodyParagraphs: [BODY_CORPUS[0]],
                dateString: 'Vol. 14, No. 385 • May 28, 2026',
                columnCount: 1,
                rotationOffset: 0,
            },
            {
                id: 'ai-a-4',
                masthead: 'ANNALS OF APPLIED CRAFT',
                subhead: 'Dataset and stimuli published alongside the paper',
                headline:
                    'Abstract Across enterprise repositories, cryptographic safeguards were the weakest element of AI-generated code: key reuse, non-random initialization vectors, and silent downgrade to legacy ciphers appeared in over a third of audited modules.',
                byline: 'Preprint v3 — revised after peer review',
                location: 'ZURICH',
                bodyParagraphs: [BODY_CORPUS[3]],
                dateString: 'Vol. 15, No. 416 • September 11, 2026',
                columnCount: 1,
                rotationOffset: 0,
            },
        ],
    },
    {
        id: 'space-planner-study',
        name: 'Studio Space Planner',
        anchor: 'Studio Space Planner',
        category: '3D Studio & Gear',
        highlightColor: '#FFE500',
        highlightStyle: 'marker',
        paperTheme: 'vintage',
        cuts: generateCutsForPhrase('Studio Space Planner', 8),
    },
    {
        id: 'text-behind',
        name: 'Text Behind Image',
        anchor: 'Text Behind Image',
        category: 'Depth Masking',
        highlightColor: '#FFE500',
        highlightStyle: 'box',
        paperTheme: 'noir',
        cuts: generateCutsForPhrase('Text Behind Image', 8),
    },
    {
        id: 'background-replace',
        name: 'Background Replace',
        anchor: 'Background Replace',
        category: 'AI Green Screen',
        highlightColor: '#00F0FF',
        highlightStyle: 'marker',
        paperTheme: 'vintage',
        cuts: generateCutsForPhrase('Background Replace', 8),
    },
    {
        id: 'optical-match-cut',
        name: 'Optical Match Cut',
        anchor: 'Optical Match Cut',
        category: 'Documentary FX',
        highlightColor: '#FFE500',
        highlightStyle: 'marker',
        paperTheme: 'vintage',
        cuts: generateCutsForPhrase('Optical Match Cut', 8),
    },
    {
        id: 'palette-extractor',
        name: 'Palette Extractor',
        anchor: 'Palette Extractor',
        category: 'Color Grading',
        highlightColor: '#FF2A85',
        highlightStyle: 'circle',
        paperTheme: 'crisp',
        cuts: generateCutsForPhrase('Palette Extractor', 8),
    },
    {
        id: 'quote-card',
        name: 'Quote Card Studio',
        anchor: 'Quote Card Studio',
        category: 'Social Cards',
        highlightColor: '#FFE500',
        highlightStyle: 'tape',
        paperTheme: 'dossier',
        cuts: generateCutsForPhrase('Quote Card Studio', 8),
    },
];
