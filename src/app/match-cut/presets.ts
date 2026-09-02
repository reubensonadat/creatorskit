// Presets & Story Corpus for Text Match Cut Studio
// Centered around CreatorsKit tools with high-energy authentic newspaper match cuts

import { NewspaperCut } from './match-cut-engine';

export interface PresetTopic {
  id: string;
  name: string;
  anchor: string;
  category: string;
  highlightColor: string;
  highlightStyle: 'marker' | 'underline' | 'box' | 'circle' | 'tape' | 'double-underline';
  paperTheme: 'vintage' | 'salmon' | 'tabloid' | 'dossier' | 'crisp' | 'noir';
  cuts: NewspaperCut[];
}

export const MASTHEADS = [
  'CREATOR KIT',
  'THE DAILY CHRONICLE',
  'THE MORNING HERALD',
  'THE DAMP BROADSHEET',
  'FINANCIAL COURIER',
  'THE LIBERTY CITY LEDGER',
  'THE SUNDAY DISPATCH',
  'METROPOLITAN GAZETTE',
  'THE GLOBAL TRIBUNE',
  'DAILY DRIVEL',
  'THE RECORDING TIMES',
];

export const SUBHEADS = [
  'Special Investigation — Exclusive Documents Inside',
  'Statement contained three facts, eleven adjectives, and one apology',
  'Insiders describe the emergency session as tense and unprecedented',
  'Our reporter waited outside the building for two hours; the building had a back exit',
  'From Our Embedded Correspondent in the Production Studio',
  'Auditors confirmed the figures were verified before the press release',
  'Committee votes unanimously to publish full findings',
];

export const LOCATIONS = [
  'SAN FRANCISCO',
  'NEW YORK',
  'LONDON',
  'TOKYO',
  'BERLIN',
  'LOS ANGELES',
  'AUSTIN',
  'TORONTO',
];

export const BYLINES = [
  'By Arthur Vance, Senior Tech Editor',
  'Investigative Team (Production Desk)',
  'By Marcus Vance and Staff Correspondents',
  'By Special Correspondent',
  'From Our Media & Creator Desk',
  'By Eleanor Hayes, Chief Analyst',
];

export const BODY_CORPUS = [
  `The spokesperson smiled and said nothing that could be quoted. Nobody was charged but several people were deeply embarrassed. The meeting was rescheduled four times and then cancelled. The corporation released a statement. Nobody read it. He returned the money. Most of it. Eventually. Local residents were surprised but not shocked. Mostly not shocked. The report is nineteen pages and solves nothing. The building has been there for years. Nobody noticed until now. Insiders say the culture was "a lot," which means something specific. She blamed her assistant. The assistant has since resigned.`,
  `The app was updated. It is worse now. The investigation is ongoing, apparently. An expert was consulted. The expert was also confused. The chairman called it unprecedented. What happened was unprecedented. Mostly not shocked. He said it twice. Nobody wrote it down. The consultant fee was not disclosed. It was large. The app was updated. It is worse now. Nobody resigned, which surprised everyone, including the board. Her publicist says she is resting and reflecting on the experience. The report is nineteen pages and solves nothing. Witnesses disagree on basically everything. A pigeon was briefly detained. It offered no statement. Nobody wrote it down. An audit was mentioned briefly and then not mentioned again. It turns out the license had expired in 2019. The email was sent to everyone, including the people it was about.`,
  `Officers are reviewing it slowly. Funding has been allocated. Its current location is unknown. The investigation is ongoing, apparently. Nobody was charged but several people were deeply embarrassed. The email was sent to everyone, including the board. It turns out the license had expired in 2019. An expert was consulted. The expert was also confused. Her publicist says she is resting and reflecting on the experience. All parties described it as a misunderstanding. A second van was also seen. Nobody mentioned this until now. She won the appeal. The other nine cases were dismissed. A local man claims responsibility. Police are not convinced. The contractor billed for work that is not visible to anyone. The mayor denied everything and then left the building. Three people clapped. Several others checked their phones.`,
  `The suspect was later found at a nearby buffet. Police arrived three hours later. They had sandwiches. The corporation released a statement. A full refund was promised to some of the affected customers. City council voted 4-3 to table the matter indefinitely. He resigned "to spend more time with his spreadsheets." All parties described it as a misunderstanding. Funding has been allocated. Its current location is unknown. He was asked to return the trophy. He kept the trophy. The meeting was rescheduled four times and then cancelled. Nobody noticed until now. Insiders say the culture was "a lot," which means something specific. Someone say it was worse but like a new way everyday. The assistant has since resigned. Experts called the situation "not ideal" and left.`,
];

export type AnchorPosition = 'auto' | 'start' | 'middle' | 'end';

/**
 * Creates dynamic, richly formatted newspaper cuts for any arbitrary user
 * phrase. `anchorPosition` controls WHERE the phrase sits inside the generated
 * sentence — beginning, middle or end — so the camera-locked highlight lands
 * exactly where the creator wants it in the line.
 */
export function generateCutsForPhrase(
  phrase: string,
  count = 8,
  anchorPosition: AnchorPosition = 'auto'
): NewspaperCut[] {
  const clean = phrase.trim() || 'Studio Space Planner';

  const startTemplates = [
    `{W} mentioned seventeen times in leaked memo, records show`,
    `{W} is changing modern video workflows, new reports confirm`,
    `{W} delivers 10x faster rendering speed, secret testing proves`,
    `{W} replaced entire legacy hardware rigs overnight, engineers say`,
    `{W} was developed in complete secrecy, studio records reveal`,
    `{W} saved hundreds of production hours, internal audit finds`,
    `{W} causes widespread industry shockwaves on unprecedented demand`,
    `{W} turned top creators into an unstoppable cultural phenomenon`,
  ];

  const middleTemplates = [
    `Leaked memo mentions {W} seventeen times`,
    `Why everyone in the studio fell silent over {W}`,
    `New reports confirm that {W} is changing modern video workflows`,
    `The director called {W} the biggest breakthrough of the season`,
    `Archived documents show sudden adoption of {W} across top channels`,
    `Witnesses describe the new {W} update as completely game-changing`,
    `Executive committee orders immediate investigation into {W}`,
    `Whistleblower releases confidential dossier explaining {W}`,
    `How top creators turned {W} into an unstoppable phenomenon`,
    `Internal audit reveals {W} saved hundreds of production hours`,
    `Critics questioned {W} until the first live demo went viral`,
    `Key witnesses testify about {W} before packed emergency session`,
  ];

  const endTemplates = [
    `The contractor billed for work that is not visible to anyone: {W}`,
    `Engineers finally revealed the hidden story behind {W}`,
    `Breaking investigation finally brings the truth about {W}`,
    `Everyone in the studio suddenly fell silent over {W}`,
    `The packed emergency session heard sworn testimony about {W}`,
    `The confidential dossier explains everything about {W}`,
    `"Just say it plainly," the man outside insisted: {W}`,
    `The biggest breakthrough of the season, according to the director, is {W}`,
  ];

  const sentenceTemplates =
    anchorPosition === 'start'
      ? startTemplates
      : anchorPosition === 'end'
        ? endTemplates
        : anchorPosition === 'middle'
          ? middleTemplates
          : [...startTemplates, ...middleTemplates, ...endTemplates];

  // Shuffle templates on every generation call for fresh dynamic variations
  const shuffledTemplates = [...sentenceTemplates].sort(() => Math.random() - 0.5);
  const shuffledMastheads = [...MASTHEADS].sort(() => Math.random() - 0.5);
  const shuffledSubheads = [...SUBHEADS].sort(() => Math.random() - 0.5);
  const shuffledLocations = [...LOCATIONS].sort(() => Math.random() - 0.5);
  const shuffledBylines = [...BYLINES].sort(() => Math.random() - 0.5);

  const cuts: NewspaperCut[] = [];

  for (let i = 0; i < count; i++) {
    const masthead = shuffledMastheads[i % shuffledMastheads.length];
    const subhead = shuffledSubheads[i % shuffledSubheads.length];
    const location = shuffledLocations[i % shuffledLocations.length];
    const byline = shuffledBylines[i % shuffledBylines.length];
    const template = shuffledTemplates[i % shuffledTemplates.length];
    const headline = template.replace(/\{W\}/g, clean);

    const year = 2026 - (i % 3);
    const day = 1 + ((i * 4 + Math.floor(Math.random() * 5)) % 28);
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const month = months[(i * 2 + Math.floor(Math.random() * 3)) % 12];
    const vol = 48 + ((i * 3 + Math.floor(Math.random() * 10)) % 25);
    const issue = 14200 + i * 82 + Math.floor(Math.random() * 50);
    const dateString = `VOL. ${vol} NO. ${issue} • ${month} ${day}, ${year} • PRICE 25 CENTS`;

    const shuffledBody = [
      BODY_CORPUS[i % BODY_CORPUS.length],
      BODY_CORPUS[(i + 2) % BODY_CORPUS.length],
      BODY_CORPUS[(i + 4) % BODY_CORPUS.length],
    ];

    cuts.push({
      id: `cut-${Date.now()}-${i + 1}`,
      masthead,
      subhead,
      headline,
      byline,
      location,
      bodyParagraphs: shuffledBody,
      dateString,
      columnCount: 2,
      rotationOffset: (Math.random() - 0.5) * 0.2, // Subtle authentic micro-jitter
      scaleOffset: (Math.random() - 0.5) * 0.005,
      dropCapLetter: headline.charAt(0).toUpperCase(),
    });
  }

  return cuts;
}

export const PRESET_TOPICS: PresetTopic[] = [
  {
    id: 'red-flags',
    name: 'Red Flags',
    // Match-cut anchors stay ≤23 chars so the camera locks tight onto the
    // SAME short phrase in every paper — that's the whole optical illusion.
    anchor: 'RED FLAGS',
    category: 'Investigations',
    highlightColor: '#FFE500',
    highlightStyle: 'marker',
    paperTheme: 'tabloid',
    cuts: [
      {
        id: 'rf-1',
        masthead: 'THE DAILY CHRONICLE',
        subhead: 'Insiders ignored warnings for months, records show',
        headline: 'Insiders ignored RED FLAGS in licensing deal for months',
        byline: 'Investigative Team (Production Desk)',
        location: 'NEW YORK',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 214 NO. 88 • TUESDAY, MARCH 3 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: -0.08,
      },
      {
        id: 'rf-2',
        masthead: 'FINANCIAL COURIER',
        subhead: 'Auditors described the ledger as unusual and loud',
        headline: 'Auditors find RED FLAGS across the entire expense ledger',
        byline: 'By Eleanor Hayes, Chief Analyst',
        location: 'LONDON',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 88 NO. 441 • MONDAY, APRIL 14 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: 0.07,
      },
      {
        id: 'rf-3',
        masthead: 'THE SUNDAY DISPATCH',
        subhead: 'Packed committee room hears sworn testimony',
        headline: '"We saw the RED FLAGS," whistleblower tells committee',
        byline: 'By Special Correspondent',
        location: 'WASHINGTON',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 51 NO. 9001 • SUNDAY, JUNE 8 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: -0.04,
      },
      {
        id: 'rf-4',
        masthead: 'DAILY DRIVEL',
        subhead: 'Timeline obtained by this newspaper contradicts earlier statements',
        headline: 'Records show RED FLAGS raised weeks before the collapse',
        byline: 'By Arthur Vance, Senior Tech Editor',
        location: 'AUSTIN',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 9 NO. 12 • FRIDAY, SEPTEMBER 19 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: 0.1,
      },
      {
        id: 'rf-5',
        masthead: 'METROPOLITAN GAZETTE',
        subhead: 'Review board met once, adjourned, and went to lunch',
        headline: 'Committee buried RED FLAGS report before the review board',
        byline: 'By Marcus Vance and Staff Correspondents',
        location: 'TORONTO',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 330 NO. 6 • TUESDAY, NOVEMBER 4 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: -0.06,
      },
      {
        id: 'rf-6',
        masthead: 'THE RECORDING TIMES',
        subhead: 'Insiders say the warnings were labeled optional reading',
        headline: 'Lawmakers cite RED FLAGS in emergency hearing on licensing',
        byline: 'From Our Media & Creator Desk',
        location: 'TOKYO',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 65 NO. 908 • SATURDAY, MAY 30 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: 0.05,
      },
      {
        id: 'rf-7',
        masthead: 'DAILY DRIVEL',
        subhead: 'Newsletter readers flagged the pattern weeks ago',
        headline: 'Analysts finally admit RED FLAGS were visible all along',
        byline: 'By Special Correspondent',
        location: 'LONDON',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 3 NO. 771 • WEDNESDAY, JULY 22 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: -0.09,
      },
      {
        id: 'rf-8',
        masthead: 'THE DAMP BROADSHEET',
        subhead: 'The second van was also seen; nobody mentioned it until now',
        headline: 'Auditors quietly attach RED FLAGS to the licensing file',
        byline: 'By Eleanor Hayes, Chief Analyst',
        location: 'NEW YORK',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 150 NO. 42 • MONDAY, AUGUST 10 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: 0.06,
      },
    ],
  },
  {
    id: 'ai-code-bugs',
    name: 'Tech Security',
    anchor: 'AI-generated code',
    category: 'Tech & Security',
    highlightColor: '#FFE500',
    highlightStyle: 'marker',
    paperTheme: 'noir',
    cuts: [
      {
        id: 'ai-code-1',
        masthead: 'CREATOR KIT',
        subhead: 'AI-generated code produces 1.7x more issues than human code',
        headline: 'AI-generated code contains more bugs and errors than human output',
        byline: 'Craig Hale',
        location: 'SAN FRANCISCO',
        bodyParagraphs: [
          'A comprehensive study by security researchers has revealed that code generated by artificial intelligence models introduces 1.7 times more syntax errors, logic regressions, and memory vulnerabilities compared to code written by human software engineers.',
          'The benchmark evaluated over forty thousand code generation tasks across Python, JavaScript, Rust, and Go. Researchers observed that while AI models write code rapidly, they frequently omit edge-case validation, boundary checks, and proper cryptographic safeguards.',
          'Enterprise development teams are advised to institute mandatory automated static analysis pipelines and peer review gates before deploying AI-assisted pull requests into production environments.',
        ],
        dateString: 'VOL. 301 NO. 77 • THURSDAY, DECEMBER 18 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: 0,
      },
      {
        id: 'ai-code-2',
        masthead: 'THE MORNING HERALD',
        subhead: 'Benchmark evaluated forty thousand tasks across four languages',
        headline: 'Security audit finds AI-generated code skips boundary checks',
        byline: 'By Eleanor Hayes, Chief Analyst',
        location: 'LONDON',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 214 NO. 9 • MONDAY, JANUARY 5 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: 0.06,
      },
      {
        id: 'ai-code-3',
        masthead: 'THE GLOBAL TRIBUNE',
        subhead: 'Developers urged to add review gates before shipping AI pull requests',
        headline: 'Engineers warn that AI-generated code ships without edge-case validation',
        byline: 'Investigative Team (Production Desk)',
        location: 'BERLIN',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 77 NO. 331 • WEDNESDAY, FEBRUARY 11 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: -0.05,
      },
      {
        id: 'ai-code-4',
        masthead: 'THE LIBERTY CITY LEDGER',
        subhead: 'Memory vulnerabilities traced back to model hallucinations in review',
        headline: 'Leaked report blames AI-generated code for the outage',
        byline: 'By Arthur Vance, Senior Tech Editor',
        location: 'AUSTIN',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 12 NO. 4402 • FRIDAY, MARCH 27 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: 0.09,
      },
      {
        id: 'ai-code-5',
        masthead: 'FINANCIAL COURIER',
        subhead: 'Static analysis pipelines now mandatory for AI-assisted releases',
        headline: 'Boards order audits after AI-generated code breached production',
        byline: 'By Special Correspondent',
        location: 'NEW YORK',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 96 NO. 15 • TUESDAY, APRIL 7 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: -0.07,
      },
      {
        id: 'ai-code-6',
        masthead: 'THE SUNDAY DISPATCH',
        subhead: 'Model vendors declined to comment before press time',
        headline: 'Critics questioned AI-generated code until the first audit',
        byline: 'By Marcus Vance',
        location: 'LOS ANGELES',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 143 NO. 21 • SUNDAY, JUNE 14 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: 0.03,
      },
      {
        id: 'ai-code-7',
        masthead: 'THE MORNING HERALD',
        subhead: 'Four languages, forty thousand tasks, one clear pattern',
        headline: 'Researchers traced the syntax errors straight to AI-generated code',
        byline: 'By Arthur Vance, Senior Tech Editor',
        location: 'SAN FRANCISCO',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 208 NO. 12 • THURSDAY, JULY 2 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: -0.04,
      },
      {
        id: 'ai-code-8',
        masthead: 'THE LIBERTY CITY LEDGER',
        subhead: 'Vendor statement promised clarity, delivered adjectives',
        headline: 'Memory vulnerabilities multiply inside AI-generated code',
        byline: 'Investigative Team (Production Desk)',
        location: 'AUSTIN',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 44 NO. 550 • FRIDAY, AUGUST 21 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: 0.08,
      },
    ],
  },
  {
    id: 'space-planner',
    name: 'Studio Space Planner',
    anchor: 'Studio Space Planner',
    category: '3D Studio & Gear',
    highlightColor: '#FFE500', // Authentic Chisel Yellow
    highlightStyle: 'marker',
    paperTheme: 'vintage',
    cuts: [
      {
        id: 'sp-1',
        masthead: 'THE LIBERTY CITY LEDGER',
        subhead: 'Our reporter waited outside the studio for two hours. The building had a back exit.',
        headline: 'Leaked memo mentions Studio Space Planner seventeen times',
        byline: 'From Our Embedded Correspondent',
        location: 'SAN FRANCISCO',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 454 NO. 342 • SATURDAY, OCTOBER 14 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: -0.1,
      },
      {
        id: 'sp-2',
        masthead: 'THE DAMP BROADSHEET',
        subhead: 'Statement contained three facts, eleven adjectives, and one apology',
        headline: '"Just Studio Space Planner," said the man outside',
        byline: 'Investigative Team (Production)',
        location: 'NEW YORK',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 102 NO. 18 • WEDNESDAY, NOVEMBER 18 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: 0.1,
      },
      {
        id: 'sp-3',
        masthead: 'FINANCIAL COURIER',
        subhead: 'Auditors confirmed the 3D studio equipment catalog is verified',
        headline: 'Studio Space Planner audit is nineteen pages long and full of gear specs',
        byline: 'By Arthur Vance, Senior Editor',
        location: 'LONDON',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 88 NO. 441 • MONDAY, DECEMBER 2 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: -0.05,
      },
      {
        id: 'sp-4',
        masthead: 'DAILY DRIVEL',
        subhead: 'Nobody resigned, which surprised everyone including the lighting crew',
        headline: 'The director billed for work that is Studio Space Planner not visible to anyone',
        byline: 'By Marcus Vance',
        location: 'LOS ANGELES',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 49 NO. 210 • FRIDAY, JANUARY 16 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: 0.08,
      },
      {
        id: 'sp-5',
        masthead: 'THE SUNDAY DISPATCH',
        subhead: 'Engineers confirm 210 realistic 3D items render with zero frame drops',
        headline: 'Why everyone in the studio suddenly fell silent over Studio Space Planner',
        byline: 'From Our Media Desk',
        location: 'BERLIN',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 114 NO. 52 • SUNDAY, FEBRUARY 22 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: -0.08,
      },
      {
        id: 'sp-6',
        masthead: 'THE GLOBAL TRIBUNE',
        subhead: 'Special Report from the Broadcast & Lighting Department',
        headline: 'Studio Space Planner replaces physical staging rigs overnight',
        byline: 'By Eleanor Hayes',
        location: 'TOKYO',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 76 NO. 89 • THURSDAY, MARCH 12 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: 0.04,
      },
      {
        id: 'sp-7',
        masthead: 'DAILY DRIVEL',
        subhead: 'Gear desks report empty showrooms and long waiting lists',
        headline: 'Studios race to adopt Studio Space Planner before the fall season',
        byline: 'From Our Embedded Correspondent',
        location: 'LOS ANGELES',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 51 NO. 300 • TUESDAY, APRIL 28 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: -0.06,
      },
      {
        id: 'sp-8',
        masthead: 'THE RECORDING TIMES',
        subhead: 'Lighting crew says the rig practically plans itself now',
        headline: 'Engineers confirm Studio Space Planner renders 210 items with zero drops',
        byline: 'By Marcus Vance',
        location: 'TOKYO',
        bodyParagraphs: BODY_CORPUS,
        dateString: 'VOL. 88 NO. 14 • SATURDAY, MAY 16 • PRICE 25 CENTS',
        columnCount: 2,
        rotationOffset: 0.07,
      },
    ],
  },
  {
    id: 'auto-captions',
    name: 'Auto Captions AI',
    anchor: 'Auto Captions AI',
    category: 'Subtitles & Voice',
    highlightColor: '#00FF66', // Neon Green
    highlightStyle: 'marker',
    paperTheme: 'salmon',
    cuts: generateCutsForPhrase('Auto Captions AI', 8),
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
    highlightColor: '#00F0FF', // Electric Cyan
    highlightStyle: 'marker',
    paperTheme: 'vintage',
    cuts: generateCutsForPhrase('Background Replace', 8),
  },
  {
    id: 'silence-trimmer',
    name: 'Silence Trimmer',
    anchor: 'Silence Trimmer',
    category: 'Podcast Audio',
    highlightColor: '#FF7700', // Vivid Orange
    highlightStyle: 'double-underline',
    paperTheme: 'tabloid',
    cuts: generateCutsForPhrase('Silence Trimmer', 8),
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
    highlightColor: '#FF2A85', // Hot Pink
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
