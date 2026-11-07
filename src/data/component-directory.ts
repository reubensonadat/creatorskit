/**
 * src/data/component-directory.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * THE UI COMPONENT DIRECTORY — the owner's personal, permanent shelf of every
 * "never build UI from scratch again" site on the web.
 *
 * Owner rulings:
 *   2026-11-05  first ruling — found a cool component site → it goes HERE,
 *               not in a lost Instagram save.
 *   2026-11-06  second ruling — QUALITY OVER VOLUME. The owner's curated
 *               list is law (threeui, HeroUI, React Bits, Animate UI, Storyset,
 *               DiceBear, libraries.dev/orbs, MapLibre from the campus guide,
 *               …). Generic filler libraries were removed on purpose. Do not
 *               re-add "everyman" sets without a ruling.
 *
 * Every page in /components derives from this file:
 *   · /components            → hub (grid + federated search)
 *   · /components/[slug]     → dedicated detail page per site
 *   · /api/component-search  → live multi-site search (see route for adapters)
 *
 * HOW TO ADD A SITE (30 seconds, no other file needs touching):
 *   1. Copy any entry below.
 *   2. Fill slug/name/url/category/copy fields.
 *   3. Pick a search strategy:
 *        'sitemap' → we fetch the site's sitemap.xml and token-match URLs
 *                    (best: real, exact component pages)
 *        'bing'    → we run a `site:domain <query>` Bing search server-side
 *                    (for sites that bot-wall or render client-side only)
 *        'link'    → no live results; we deep-link to the site's own search
 *   4. That's it — hub grid, detail page, sitemap and federated search all
 *      pick it up automatically.
 *
 * Verified against the live web on 2026-11-06 (sitemap loc counts probed):
 *   · threeui 2,431 · untitledui 2,383 · originkit 933 · heroui 533
 *   · bencho 476 · watermelon 474 · uiarc/Arc UI 405 · smoothui 288
 *   · animate-ui 252 · reactbits 237 · kokonut 126 · libraries.dev 19
 *   · storyset sitemap 500s → Bing + its own /search endpoint (verified 200)
 *   · rareui behind Vercel checkpoint, sileo sitemap 404, reactdrops sitemap
 *     404 → Bing strategy · dicebear/blobatar/koboyo/drawbly → link strategy
 *   · uiverse.io Cloudflare bot-walls every route → Bing (works)
 *   · DuckDuckGo html/lite blocked from this network → Bing (works)
 */

export type DirectoryCategoryId =
    | 'copy-paste'
    | 'animation'
    | 'assets-3d'
    | 'primitives'
    | 'inspiration'
    | 'galleries'
    | 'icons'
    | 'tools';

export interface DirectoryCategory {
    id: DirectoryCategoryId;
    label: string;
    blurb: string;
}

export interface ComponentSite {
    /** url-safe id — becomes /components/[slug] */
    slug: string;
    name: string;
    /** homepage (no trailing slash) */
    url: string;
    /** used for favicons + Bing `site:` queries */
    domain: string;
    category: DirectoryCategoryId;
    /** one-line elevator pitch (card + meta description) */
    tagline: string;
    /** 2–4 sentence deep description for the detail page */
    description: string;
    /** what tech the components are built for */
    stack: string[];
    pricing: 'FREE' | 'FREE + PRO' | 'PAID';
    license?: string;
    /** copy-paste / CLI install line, if one exists */
    install?: string;
    /** when to reach for this site (detail page chips) */
    bestFor: string[];
    /** detail page bullet list */
    highlights: string[];
    /** live-search adapter config */
    search: {
        strategy: 'sitemap' | 'bing' | 'link';
        /** sitemap strategy: the XML url (sitemap-index files are followed) */
        sitemapUrl?: string;
        /** if sitemap fails, fall back to Bing instead of giving up */
        bingFallback?: boolean;
        /** bing strategy: lower = queried first when capping concurrent engines */
        priority?: number;
    };
    /** guaranteed deep link — `{q}` is replaced with the user's query */
    searchUrl: string;
    /** search chip labels shown on the card */
    tags: string[];
    /** the owner's personally-named picks render first */
    featured?: boolean;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const DIRECTORY_CATEGORIES: DirectoryCategory[] = [
    {
        id: 'copy-paste',
        label: 'COPY, PASTE, SHIP',
        blurb: 'Component libraries you install or paste straight into your codebase — no design work required.',
    },
    {
        id: 'animation',
        label: 'MOTION & EFFECTS',
        blurb: 'Animated components and effects that make a page feel expensive: text effects, 3D cards, marquees, spotlights.',
    },
    {
        id: 'assets-3d',
        label: '3D, ILLUSTRATION & GENERATIVE',
        blurb: 'Shaders, Three.js assets, illustrated characters, avatars-from-seeds and canvas toys — the visual layer generic libraries never give you.',
    },
    {
        id: 'primitives',
        label: 'SYSTEMS & PRIMITIVES',
        blurb: 'The headless engines underneath beautiful UI — accessibility, state and behavior with zero styling opinions.',
    },
    {
        id: 'inspiration',
        label: 'REAL-APP INSPIRATION',
        blurb: 'Screenshots and flows from real shipping products — steal proven patterns, not Dribbble fantasies.',
    },
    {
        id: 'galleries',
        label: 'TASTE GALLERIES',
        blurb: 'The two galleries worth scrolling — where you go to build an eye, not to find a component.',
    },
    {
        id: 'icons',
        label: 'ICONS',
        blurb: 'The default icon set of the modern era, plus the meta-search that covers every other set ever made.',
    },
    {
        id: 'tools',
        label: 'SPECIALIZED ENGINES',
        blurb: 'Single-problem visual engines — maps that look custom, theming that looks branded — solved at a level generic libraries never reach.',
    },
];

// ─── The sites ────────────────────────────────────────────────────────────────

export const COMPONENT_SITES: ComponentSite[] = [
    // ═══ COPY, PASTE, SHIP ═════════════════════════════════════════════════
    {
        slug: 'uiverse',
        name: 'uiverse.io',
        url: 'https://uiverse.io',
        domain: 'uiverse.io',
        category: 'copy-paste',
        featured: true,
        tagline: 'Thousands of free MIT HTML/CSS elements — buttons, loaders, toggles, inputs — no account needed',
        description:
            'The fastest button/loader/toggle fix on the internet. Community-uploaded UI elements published under MIT — click one, copy the HTML/CSS (or Tailwind) and paste it anywhere, React included. Everything renders live on the site so you can feel the hover states before committing. No login, no paywall, no attribution required.',
        stack: ['HTML/CSS', 'Tailwind', 'React-ready'],
        pricing: 'FREE',
        license: 'MIT',
        install: 'Copy & paste from the site',
        bestFor: ['Buttons', 'Loaders & spinners', 'Toggles & checkboxes', 'Inputs', 'Cards'],
        highlights: [
            'Every element is MIT licensed — use commercially, never credit',
            'Live preview + one-click copy of HTML, CSS or Tailwind versions',
            'Community-voted, so the top of each category is genuinely the best',
            'Works in plain HTML projects — zero framework lock-in',
        ],
        search: { strategy: 'bing', priority: 1 },
        searchUrl: 'https://uiverse.io/',
        tags: ['buttons', 'loaders', 'toggles', 'inputs'],
    },
    {
        slug: '21st-dev',
        name: '21st.dev',
        url: 'https://21st.dev',
        domain: '21st.dev',
        category: 'copy-paste',
        featured: true,
        tagline: 'The React/Next component marketplace — 12K+ live components, installed by CLI or coding agent',
        description:
            'A curated marketplace of community and pro components for React and Next.js — every piece runs live on the site with an author, and copies as a prompt or shadcn CLI install. Their sitemap exposes thousands of component URLs, which this directory searches directly (their robots.txt explicitly welcomes coding agents). Home of liquid-glass buttons, venom buttons and the trend-chasing stuff that shows up on X a week later.',
        stack: ['React', 'Next.js', 'Tailwind', 'shadcn-style'],
        pricing: 'FREE + PRO',
        license: 'Per-component (mostly MIT)',
        install: 'npx shadcn@latest add "https://21st.dev/<component-url>"',
        bestFor: ['Hero sections', 'Glass/3D buttons', 'Animated widgets', 'Trend components'],
        highlights: [
            '12K+ community components, 1.2K hero sections alone',
            'Every component previews live — hover it, resize it, then copy',
            'Installs via the standard shadcn CLI — lands in your codebase, not an npm dep',
            'Curated + pro tiers filter out the low-effort uploads',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://21st.dev/sitemap.xml' },
        searchUrl: 'https://21st.dev/community/components',
        tags: ['react', 'next', 'heroes', 'glass'],
    },
    {
        slug: 'shadcn-ui',
        name: 'shadcn/ui',
        url: 'https://ui.shadcn.com',
        domain: 'ui.shadcn.com',
        category: 'copy-paste',
        tagline: 'The canonical copy-into-your-repo component system — Radix + Tailwind, owned by you',
        description:
            'The library that changed how everyone ships UI. Components are copied into your codebase via CLI (not installed as a dependency), built on Radix primitives with Tailwind styling — so you own every line and restyle anything without fighting a package. The default foundation of most modern React apps, and the format 21st.dev, Kokonut UI and half this directory are built on.',
        stack: ['React', 'Next.js', 'Tailwind', 'Radix'],
        pricing: 'FREE',
        license: 'MIT',
        install: 'npx shadcn@latest add button',
        bestFor: ['App foundations', 'Forms & tables', 'Dialogs & menus', 'Design-system base'],
        highlights: [
            'You own the code — restyle and fork without dependency hell',
            'Built on Radix: accessibility and keyboard nav for free',
            'CLI registry system that the whole component ecosystem standardized on',
            'Theming via CSS variables plays perfectly with TweakCN (see Engines)',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://ui.shadcn.com/sitemap.xml', bingFallback: true },
        searchUrl: 'https://ui.shadcn.com/docs/components',
        tags: ['react', 'tailwind', 'radix', 'cli'],
    },
    {
        slug: 'heroui',
        name: 'HeroUI',
        url: 'https://heroui.com',
        domain: 'heroui.com',
        category: 'copy-paste',
        featured: true,
        tagline: 'HeroUI v3 (ex-NextUI) — beautiful by default, customizable by design',
        description:
            'The evolution of NextUI: a full React component library where every piece ships gorgeous defaults you can still override completely. v3 rebuilt the theming around Tailwind CSS variables, so components drop into modern Tailwind apps without the usual library-clash. When a project needs an entire polished system today — not a component at a time — this is the owner-pick answer.',
        stack: ['React', 'Next.js', 'Tailwind'],
        pricing: 'FREE',
        license: 'MIT',
        install: 'npm i @heroui/react',
        bestFor: ['Full app systems', 'Beautiful defaults', 'Dark mode out of the box', 'Tailwind theming'],
        highlights: [
            'Every component looks designed the second you render it',
            'v3 theming rides plain Tailwind variables — no fighting the library',
            'Docs sitemap is live-searchable from this directory (533 URLs)',
            'The upgrade path when shadcn-level assembly is too slow',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://heroui.com/sitemap.xml', bingFallback: true },
        searchUrl: 'https://heroui.com/',
        tags: ['react', 'system', 'tailwind', 'defaults'],
    },
    {
        slug: 'untitledui',
        name: 'Untitled UI',
        url: 'https://www.untitledui.com',
        domain: 'untitledui.com',
        category: 'copy-paste',
        tagline: 'The Figma UI kit + React component library the pro designers actually use',
        description:
            'Untitled UI is the design-system product other kits get compared to: an obsessively consistent Figma library with a matching React component set. Free tier gives you real components; pro unlocks the full system. If the goal is "this looks like a studio built it", this is the studio.',
        stack: ['React', 'Tailwind', 'Figma'],
        pricing: 'FREE + PRO',
        license: 'Custom (free tier)',
        install: 'React components via their docs / Figma via the kit',
        bestFor: ['Design-system consistency', 'Figma hand-off', 'Pro-grade forms & tables', 'Marketing sites'],
        highlights: [
            'The reference point for clean, professional SaaS aesthetics',
            'Figma source and React components stay in sync',
            '2,383 sitemap URLs — deeply searchable from this directory',
            'Design tokens documented so engineers and designers speak one language',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://www.untitledui.com/sitemap.xml' },
        searchUrl: 'https://www.untitledui.com/',
        tags: ['figma', 'react', 'system', 'pro'],
    },
    {
        slug: 'kokonutui',
        name: 'Kokonut UI',
        url: 'https://kokonutui.com',
        domain: 'kokonutui.com',
        category: 'copy-paste',
        tagline: 'Free open-source React and Tailwind components, shadcn-style with taste',
        description:
            'An indie, fully open-source set of React + Tailwind components following shadcn conventions — cards, buttons, inputs and app bits with a distinct modern look. Small enough to read end-to-end, free enough to never think about. A quiet owner favorite from the curated list.',
        stack: ['React', 'Tailwind', 'shadcn-style'],
        pricing: 'FREE',
        license: 'MIT',
        install: 'Copy & paste (shadcn-style)',
        bestFor: ['shadcn-compatible extras', 'Indie quality', 'Quick app bits'],
        highlights: [
            'shadcn file conventions — drops into any shadcn project',
            'Fully open source with no pro wall',
            'Every component previewed live before you copy',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://kokonutui.com/sitemap.xml', bingFallback: true },
        searchUrl: 'https://kokonutui.com/',
        tags: ['react', 'tailwind', 'shadcn', 'indie'],
    },
    {
        slug: 'arc-ui',
        name: 'Arc UI',
        url: 'https://uiarc.dev',
        domain: 'uiarc.dev',
        category: 'copy-paste',
        tagline: 'The React UI library your AI agents can build with — components designed for agent workflows',
        description:
            'Arc UI takes the post-2025 reality seriously: half of all UI will be assembled by coding agents, so it documents its components in a machine-readable way agents can actually consume. Beautiful React primitives for humans, structured metadata for your AI pair — the first library built for both readers of your codebase.',
        stack: ['React', 'AI-agent friendly'],
        pricing: 'FREE',
        license: 'MIT',
        bestFor: ['AI-assisted builds', 'Agent-driven UI', 'Modern React primitives'],
        highlights: [
            'Components expose structured metadata coding agents understand',
            'Clean React primitives that hold up without an agent in sight',
            '405 sitemap URLs — the docs are deep and searchable from here',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://uiarc.dev/sitemap.xml', bingFallback: true },
        searchUrl: 'https://uiarc.dev/',
        tags: ['react', 'ai-agents', 'primitives'],
    },
    {
        slug: 'watermelon',
        name: 'Watermelon UI',
        url: 'https://ui.watermelon.sh',
        domain: 'ui.watermelon.sh',
        category: 'copy-paste',
        tagline: 'Free React components, blocks and dashboards — generous and polished',
        description:
            'A free library of React components, page-level blocks and full dashboard layouts. The rare kind of free resource where the dashboards actually look production-grade. Reach for it when a project needs an admin panel or app shell that feels designed, not defaulted.',
        stack: ['React', 'Tailwind'],
        pricing: 'FREE',
        license: 'MIT',
        install: 'Copy & paste from the site',
        bestFor: ['Dashboards', 'App shells', 'Page blocks', 'Admin panels'],
        highlights: [
            'Dashboards and blocks, not just atoms',
            'Everything free — no gated "pro" grid',
            '474 sitemap URLs searchable from this directory',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://ui.watermelon.sh/sitemap.xml', bingFallback: true },
        searchUrl: 'https://ui.watermelon.sh/',
        tags: ['react', 'dashboard', 'blocks', 'free'],
    },
    {
        slug: 'tailwindui',
        name: 'Tailwind Plus (Tailwind UI)',
        url: 'https://tailwindui.com',
        domain: 'tailwindui.com',
        category: 'copy-paste',
        tagline: 'The official paid Tailwind Labs library — the reference quality bar',
        description:
            'Tailwind UI, now Tailwind Plus: the official component + template shop from the Tailwind team. Paid, and worth it when a client is paying — every pattern is what the framework authors consider correct. Comes with Figma kits and full site templates.',
        stack: ['React', 'Vue', 'HTML', 'Tailwind'],
        pricing: 'PAID',
        license: 'Commercial per-seat',
        install: 'Template download / copy & paste',
        bestFor: ['Client work', 'Reference quality', 'Full site templates', 'Figma kits'],
        highlights: [
            'The benchmark every other Tailwind library measures against',
            'Every pattern audited by the Tailwind core team',
            'Includes application UIs and complete site templates',
        ],
        search: { strategy: 'link' },
        searchUrl: 'https://tailwindui.com/components',
        tags: ['paid', 'official', 'templates'],
    },
    {
        slug: 'rareui',
        name: 'Rare UI',
        url: 'https://rareui.com',
        domain: 'rareui.com',
        category: 'copy-paste',
        tagline: 'Owner-bookmarked component set — bot-walled, so this directory searches it via Bing',
        description:
            'A hand-picked pick from the owner\'s curated list. The site sits behind Vercel\'s security checkpoint, which blocks direct crawling — so this directory runs Bing site-searches against it instead and always offers the direct link. The shelf entry exists regardless of walls: nothing the owner saves gets lost.',
        stack: ['React', 'Web'],
        pricing: 'FREE',
        bestFor: ['Curated components', 'Standing out'],
        highlights: [
            'Part of the permanent curated 2026-11-06 shelf',
            'Live results served via Bing site-search from this directory',
            'Direct link always one click away on its detail page',
        ],
        search: { strategy: 'bing', priority: 9 },
        searchUrl: 'https://rareui.com/',
        tags: ['react', 'bookmark', 'bing-searched'],
    },
    {
        slug: 'sileo',
        name: 'Sileo',
        url: 'https://sileo.aaryan.design',
        domain: 'aaryan.design',
        category: 'copy-paste',
        tagline: 'A designer\'s own React component set — independent, taste-driven, off the big platforms',
        description:
            'Sileo is a personal component collection published on the designer\'s own domain — exactly the kind of independent, taste-driven set the big directories never surface. No sitemap exposed, so this directory searches it via Bing site-queries and links straight through.',
        stack: ['React', 'Web'],
        pricing: 'FREE',
        bestFor: ['Indie component sets', 'Distinctive pieces', 'Supporting independent makers'],
        highlights: [
            'Independent maker quality — not a template-mill product',
            'Part of the permanent curated 2026-11-06 shelf',
            'Live results served via Bing site-search from this directory',
        ],
        search: { strategy: 'bing', priority: 10 },
        searchUrl: 'https://sileo.aaryan.design/',
        tags: ['react', 'indie', 'designer'],
    },

    // ═══ MOTION & EFFECTS ══════════════════════════════════════════════════
    {
        slug: 'aceternity',
        name: 'Aceternity UI',
        url: 'https://aceternity.com',
        domain: 'aceternity.com',
        category: 'animation',
        featured: true,
        tagline: 'The "how did they do that" library — spotlights, 3D cards, text effects for wow landing pages',
        description:
            'Free + pro animated components built on Tailwind and Motion that make landing pages feel cinematic: moving spotlights, 3D card tilts, infinite moving beams, walking text. This is where the hero sections you screenshot on X actually come from. Copy-paste via shadcn-style CLI, with pro tier for the fancier effects.',
        stack: ['React', 'Next.js', 'Tailwind', 'Motion'],
        pricing: 'FREE + PRO',
        license: 'Custom (free core)',
        install: 'npx shadcn@latest add "https://aceternity.com/<component>"',
        bestFor: ['Hero effects', '3D cards', 'Text animations', 'Beams & glows'],
        highlights: [
            'Every effect demoed live with copyable code below it',
            'The source of half the award-winning Next.js landing pages you see',
            'Clean Tailwind + Motion code you can actually read and tweak',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://aceternity.com/sitemap.xml' },
        searchUrl: 'https://aceternity.com/components',
        tags: ['3d', 'spotlight', 'text-effects'],
    },
    {
        slug: 'reactbits',
        name: 'React Bits',
        url: 'https://reactbits.dev',
        domain: 'reactbits.dev',
        category: 'animation',
        featured: true,
        tagline: 'Free animated React components — the flashy-effects catalog with live playgrounds',
        description:
            'A beloved catalog of animated React components: split texts, aurora and particle backgrounds, glass cards, image-trail effects, scroll reveals — each with a live playground, tweakable props and dependency-tagged code (CSS, JS or TS flavors). The site reads like a menu of "make my page feel alive" options.',
        stack: ['React', 'CSS', 'Motion', 'TS'],
        pricing: 'FREE',
        license: 'MIT-style (per component)',
        install: 'Copy & paste from the site',
        bestFor: ['Text animations', 'Animated backgrounds', 'Scroll effects', 'Flashy heroes'],
        highlights: [
            'Every component has an interactive playground with props',
            'Code provided in plain CSS, JS and TS variants',
            'One of the most-saved component sites on the internet — now it lives here instead',
            '237 sitemap URLs — searchable from this directory',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://reactbits.dev/sitemap.xml', bingFallback: true },
        searchUrl: 'https://reactbits.dev/',
        tags: ['text-effects', 'backgrounds', 'scroll'],
    },
    {
        slug: 'magicui',
        name: 'Magic UI',
        url: 'https://magicui.design',
        domain: 'magicui.design',
        category: 'animation',
        tagline: '150+ animated components & effects — the shadcn-native motion library',
        description:
            '150+ open-source animated components built to pair with shadcn/ui — marquee rows, animated number tickers, shimmer buttons, border beams, particles. Motion-based, copy-paste, MIT. Aceternity for people who want everything free and composable.',
        stack: ['React', 'Tailwind', 'Motion'],
        pricing: 'FREE',
        license: 'MIT',
        install: 'npx shadcn@latest add "https://magicui.design/<component>"',
        bestFor: ['Marquees', 'Beams & borders', 'Number tickers', 'Backgrounds'],
        highlights: [
            '150+ effects, all MIT, all copy-paste',
            'Designed to sit alongside shadcn/ui components seamlessly',
            'The interactive docs demos double as a component playground',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://magicui.design/sitemap.xml' },
        searchUrl: 'https://magicui.design/components',
        tags: ['marquee', 'particles', 'shimmer'],
    },
    {
        slug: 'motion',
        name: 'Motion (Framer Motion)',
        url: 'https://motion.dev',
        domain: 'motion.dev',
        category: 'animation',
        tagline: 'The animation engine behind modern web UI — plus 50+ copy-paste Motion Primitives',
        description:
            'Motion is the animation library (formerly Framer Motion) that React apps standardize on — springs, gestures, scroll, layout animations. The Primitives section ships production-ready animated widgets (magnetic buttons, dock hover, carousels, sliders) as copy-paste code. When a copied component breaks, this is the docs you read to fix it.',
        stack: ['React', 'JavaScript', 'Motion'],
        pricing: 'FREE',
        license: 'MIT',
        install: 'npm i motion',
        bestFor: ['Animation engine', 'Magnetic/springy widgets', 'Scroll animation', 'Gesture handling'],
        highlights: [
            'Motion Primitives: 50+ polished animated widgets, free and MIT',
            'The docs are the best animation teaching material on the web',
            'Springs over durations — interfaces that feel physical',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://motion.dev/sitemap.xml' },
        searchUrl: 'https://motion.dev/primitives',
        tags: ['springs', 'gestures', 'scroll'],
    },
    {
        slug: 'animate-ui',
        name: 'Animate UI',
        url: 'https://animate-ui.com',
        domain: 'animate-ui.com',
        category: 'animation',
        tagline: 'Animated primitives for React — Motion-powered, shadcn-compatible, copy-paste',
        description:
            'A focused set of animated React primitives built on Motion and Tailwind, designed to drop into shadcn/ui projects as first-class citizens. Buttons that breathe, tabs that glide, accordions with real easing — small interactions at a polish level that makes a UI feel expensive.',
        stack: ['React', 'Motion', 'Tailwind', 'shadcn-style'],
        pricing: 'FREE',
        license: 'MIT',
        install: 'Copy & paste / registry',
        bestFor: ['Animated primitives', 'shadcn projects', 'Micro-motion'],
        highlights: [
            'Motion-based primitives that pair cleanly with shadcn/ui',
            'Every animation tunable via props, not hardcoded keyframes',
            '252 sitemap URLs — searchable from this directory',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://animate-ui.com/sitemap.xml', bingFallback: true },
        searchUrl: 'https://animate-ui.com/',
        tags: ['react', 'motion', 'shadcn'],
    },
    {
        slug: 'originkit',
        name: 'OriginKit',
        url: 'https://originkit.dev',
        domain: 'originkit.dev',
        category: 'animation',
        tagline: 'Free animated component library for modern websites — effects-first, framework-light',
        description:
            'OriginKit ships free animated components for modern websites — the glossy hover states, reveals and transitions that make a landing page feel current. Browse, preview, copy. No framework ceremony, no paywall.',
        stack: ['React', 'Tailwind', 'Web'],
        pricing: 'FREE',
        install: 'Copy & paste from the site',
        bestFor: ['Landing-page motion', 'Hover effects', 'Reveals'],
        highlights: [
            '933 sitemap URLs — one of the deeper catalogs in this directory',
            'Effects you can paste into any modern stack',
            'Completely free with no account',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://www.originkit.dev/sitemap.xml', bingFallback: true },
        searchUrl: 'https://originkit.dev/',
        tags: ['animation', 'landing', 'free'],
    },
    {
        slug: 'bencho',
        name: 'Bencho',
        url: 'https://bencho.dev',
        domain: 'bencho.dev',
        category: 'animation',
        tagline: 'Interactive React components & micro-interactions — the feel-good layer',
        description:
            'Bencho specializes in interactive React UI components and micro-interactions — the small moments (hover, press, drag, reveal) that separate a fine interface from one people enjoy touching. A curated, modern collection for when the layout is done and the feel is not.',
        stack: ['React', 'Tailwind', 'Motion'],
        pricing: 'FREE',
        install: 'Copy & paste from the site',
        bestFor: ['Micro-interactions', 'Hover states', 'Interactive widgets'],
        highlights: [
            'Interaction-first catalog — every demo responds on the page',
            '476 sitemap URLs — searchable from this directory',
            'Modern, tasteful defaults over dated patterns',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://bencho.dev/sitemap.xml', bingFallback: true },
        searchUrl: 'https://bencho.dev/',
        tags: ['micro-interactions', 'react', 'hover'],
    },
    {
        slug: 'smoothui',
        name: 'SmoothUI',
        url: 'https://smoothui.dev',
        domain: 'smoothui.dev',
        category: 'animation',
        tagline: 'Animated React components for shadcn/ui — Motion & Tailwind, drop-in polish',
        description:
            'SmoothUI takes everyday shadcn/ui-style components and gives them real motion — animated dialogs, sliding sheets, morphing buttons — via Motion and Tailwind. The shortest path from "functional shadcn app" to "shadcn app that feels premium".',
        stack: ['React', 'Tailwind', 'Motion', 'shadcn-style'],
        pricing: 'FREE',
        install: 'Copy & paste from the site',
        bestFor: ['shadcn upgrades', 'Animated dialogs & sheets', 'App polish'],
        highlights: [
            'Purpose-built for shadcn/ui projects — same file conventions',
            'Motion choreography already done for you',
            '288 sitemap URLs — searchable from this directory',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://smoothui.dev/sitemap.xml', bingFallback: true },
        searchUrl: 'https://smoothui.dev/',
        tags: ['shadcn', 'motion', 'dialogs'],
    },
    {
        slug: 'reactdrops',
        name: 'ReactDrops',
        url: 'https://reactdrops.dev',
        domain: 'reactdrops.dev',
        category: 'animation',
        tagline: 'Components that make you stand out — the showpiece collection',
        description:
            'ReactDrops curates components with one job: making a page stand out. Showpiece heroes, distinctive widgets and effects you will not find in the default libraries. Bot-walled to direct crawlers, so this directory searches it through Bing instead.',
        stack: ['React'],
        pricing: 'FREE',
        install: 'Copy & paste from the site',
        bestFor: ['Showpiece sections', 'Distinctive widgets', 'Standing out'],
        highlights: [
            'Curation bias toward the rare over the routine',
            'Everything copy-paste free',
            'Live results served via Bing site-search from this directory',
        ],
        search: { strategy: 'bing', priority: 8 },
        searchUrl: 'https://reactdrops.dev/',
        tags: ['react', 'showpiece', 'unique'],
    },
    {
        slug: 'libraries-dev',
        name: 'Libraries.dev',
        url: 'https://libraries.dev',
        domain: 'libraries.dev',
        category: 'animation',
        tagline: 'Libraries and models for next-gen UI — orbs, beams, gooey, metal',
        description:
            'A small, strange, wonderful collection of next-gen UI libraries and models: the thinking orbs (the owner calls them "thinking orbs" — libraries.dev/orbs), beam effects, gooey interactions, voice rings, metal shaders. The experimental shelf of this directory — drop one into a hero and watch people ask how.',
        stack: ['Web', 'React', 'Shaders'],
        pricing: 'FREE',
        bestFor: ['Thinking orbs', 'Shader effects', 'Experimental heroes', 'Next-gen vibes'],
        highlights: [
            'Home of the famous orbs — libraries.dev/orbs',
            'Effects you will not find anywhere else in this directory',
            'Small catalog (19 URLs) — every entry searchable from here',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://libraries.dev/sitemap.xml' },
        searchUrl: 'https://libraries.dev/',
        tags: ['orbs', 'shaders', 'experimental'],
    },

    // ═══ 3D, ILLUSTRATION & GENERATIVE ═════════════════════════════════════
    {
        slug: 'threeui',
        name: 'ThreeUI',
        url: 'https://threeui.com',
        domain: 'threeui.com',
        category: 'assets-3d',
        tagline: 'Three.js components, templates & interactive shaders — 3D without the 3D learning curve',
        description:
            'ThreeUI turns Three.js into copy-paste components: interactive shaders, 3D asset scenes (Apple-device mocks, product films), templates and effects that would take a graphics engineer a week. The deepest 3D-component sitemap in this directory at 2,431 URLs — search it live from here.',
        stack: ['Three.js', 'React', 'WebGL', 'Shaders'],
        pricing: 'FREE + PRO',
        license: 'Per-asset',
        install: 'Copy & paste from the site',
        bestFor: ['3D hero scenes', 'Interactive shaders', 'Product mock films', 'WebGL without tears'],
        highlights: [
            '2,431 sitemap URLs — the deepest live-searchable 3D catalog here',
            'Ready-made 3D asset scenes (devices, products, abstract)',
            'Shaders as components — visual effects with copy-paste ergonomics',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://threeui.com/sitemap.xml' },
        searchUrl: 'https://threeui.com/',
        tags: ['threejs', 'webgl', 'shaders', '3d'],
    },
    {
        slug: 'storyset',
        name: 'Storyset',
        url: 'https://storyset.com',
        domain: 'storyset.com',
        category: 'assets-3d',
        tagline: 'Customize, animate and download illustrations for free — the owner\'s illustration engine',
        description:
            'Storyset (from the Freepik family) is where the owner animates the site\'s illustration style: pick a character or scene, recolor it to the palette, choose an animation style, export SVG/PNG/GIF or get the code. Empty states, 404s, onboarding graphics — done in minutes. Its own search endpoint is wired into this directory\'s deep links.',
        stack: ['SVG', 'GIF', 'Lottie-friendly', 'Web'],
        pricing: 'FREE',
        license: 'Attribution (free tier)',
        install: 'Download SVG / PNG / GIF or embed code',
        bestFor: ['Empty states', 'Onboarding graphics', 'Animated illustrations', '404 pages'],
        highlights: [
            'Recolor any illustration to your brand palette before export',
            'Animation styles per illustration — static, hover, looped scene',
            'Exports SVG, PNG and animated GIF',
            'Verified in-site search (storyset.com/search) wired to every card here',
        ],
        search: { strategy: 'bing', priority: 5 },
        searchUrl: 'https://storyset.com/search?query={q}',
        tags: ['illustrations', 'animated', 'svg'],
    },
    {
        slug: 'dicebear',
        name: 'DiceBear',
        url: 'https://www.dicebear.com',
        domain: 'dicebear.com',
        category: 'assets-3d',
        tagline: 'Open-source avatar library & API — deterministic avatars from a seed string',
        description:
            'The avatar engine the owner was trying to remember ("the free one that uses a seed"): give DiceBear any seed string and it deterministically generates the same character every time, across 30+ art styles. HTTP API plus libraries, all open source — perfect for default user avatars, placeholder identities and generative placeholder art.',
        stack: ['HTTP API', 'SVG', 'React', 'Anything'],
        pricing: 'FREE',
        license: 'MIT (code) / per-style (art)',
        install: 'No package needed — plain img tag against the HTTP API',
        bestFor: ['Default avatars', 'Seeded placeholder art', 'Identity previews', 'Generative mocks'],
        highlights: [
            'Deterministic: same seed string, same avatar, forever',
            '30+ art styles — adventurers, bottts, initials, geometric, pixel',
            'Serves SVG over a free HTTP API — works in any stack, no JS needed',
        ],
        search: { strategy: 'link' },
        searchUrl: 'https://www.dicebear.com/styles/',
        tags: ['avatars', 'seed', 'generative', 'api'],
    },
    {
        slug: 'blobatar',
        name: 'blobatar',
        url: 'https://blobatar.dev',
        domain: 'blobatar.dev',
        category: 'assets-3d',
        tagline: 'Deterministic geometric blobatars — organic avatars from any seed',
        description:
            'blobatar generates smooth geometric blob avatars deterministically from a seed — the organic, non-character alternative to DiceBear for default avatars and identity placeholders. Tiny site, does one thing perfectly: same seed, same blob, forever.',
        stack: ['Web', 'React components'],
        pricing: 'FREE',
        bestFor: ['Abstract avatars', 'Seed-based identity', 'Generative blobs'],
        highlights: [
            'Deterministic generation — stable identities from strings',
            'In-browser editor plus a components page for embedding',
            'The minimal answer to "avatars but make them abstract"',
        ],
        search: { strategy: 'link' },
        searchUrl: 'https://blobatar.dev/',
        tags: ['avatars', 'blobs', 'seed'],
    },
    {
        slug: 'koboyo',
        name: 'Koboyo',
        url: 'https://koboyo.com',
        domain: 'koboyo.com',
        category: 'assets-3d',
        tagline: 'Infinite Canvas — pan-and-zoom board components without building them yourself',
        description:
            'Koboyo ships the infinite-canvas experience — the free pan/zoom board surface that usually costs weeks of viewport math — as something you drop into a project. The owner-bookmarked pick for anything board-like: moodboards, mapping tools, canvas editors.',
        stack: ['React', 'Canvas'],
        pricing: 'FREE',
        bestFor: ['Infinite canvas', 'Pan/zoom boards', 'Editor surfaces'],
        highlights: [
            'The hard part of canvas apps (viewport, gestures, zoom) pre-solved',
            'Owner pick from the curated 2026-11-06 list',
            'Live editor and component docs on the site',
        ],
        search: { strategy: 'link' },
        searchUrl: 'https://koboyo.com/',
        tags: ['canvas', 'infinite', 'board'],
    },
    {
        slug: 'drawbly',
        name: 'Drawbly',
        url: 'https://drawbly.dev',
        domain: 'drawbly.dev',
        category: 'assets-3d',
        tagline: 'Owner-bookmarked .dev tool — kept here so it is never lost',
        description:
            'A hand-picked bookmark from the owner\'s curated list. The site was unreachable at listing time, so it lives here exactly as promised: once it is back, its entry gets real search wiring. This is the directory doing its one true job — nothing the owner saves ever gets lost again.',
        stack: ['Web'],
        pricing: 'FREE',
        bestFor: ['Owner bookmarks', 'Discovering on return visits'],
        highlights: [
            'Part of the permanent curated shelf regardless of uptime',
            'Will gain a live search strategy once the site responds',
        ],
        search: { strategy: 'link' },
        searchUrl: 'https://drawbly.dev/',
        tags: ['bookmark', 'dev'],
    },

    // ═══ SYSTEMS & PRIMITIVES ══════════════════════════════════════════════
    {
        slug: 'radix-ui',
        name: 'Radix UI',
        url: 'https://www.radix-ui.com',
        domain: 'radix-ui.com',
        category: 'primitives',
        tagline: 'Headless, accessible primitives — the engine inside shadcn/ui',
        description:
            'Unstyled, fully-accessible primitives (dialogs, popovers, selects, sliders) with all the hard parts solved: focus trapping, keyboard nav, ARIA, portal stacking. Ship your own design system on top, or just read their source to learn how UI actually works.',
        stack: ['React'],
        pricing: 'FREE',
        license: 'MIT',
        install: 'npm i radix-ui',
        bestFor: ['Accessible dialogs/menus', 'Custom design systems', 'Understanding UI internals'],
        highlights: [
            'Behavior + accessibility solved; you style only',
            'The foundation shadcn/ui is built on — same mental model',
            'Phenomenal "why is this hard" documentation',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://www.radix-ui.com/sitemap.xml', bingFallback: true },
        searchUrl: 'https://www.radix-ui.com/primitives/docs/overview/introduction',
        tags: ['headless', 'a11y', 'react'],
    },
    {
        slug: 'base-ui',
        name: 'Base UI',
        url: 'https://base-ui.com',
        domain: 'base-ui.com',
        category: 'primitives',
        tagline: 'The MUI team\'s headless primitives — Radix\'s newest challenger',
        description:
            'Headless, accessible component primitives from the Material UI team, built for the modern React era. Slightly different API taste than Radix (hooks-first composition) and increasingly the primitives layer for new stacks. Watch this one.',
        stack: ['React'],
        pricing: 'FREE',
        license: 'MIT',
        install: 'npm i @base-ui-components/react',
        bestFor: ['Headless foundations', 'New React projects', 'Radix alternatives'],
        highlights: [
            'Battle-tested team behind MUI, rebuilt headless',
            'First-class TypeScript with tiny, tree-shakeable packages',
            'Clean migration story if you outgrow Radix',
        ],
        search: { strategy: 'link' },
        searchUrl: 'https://base-ui.com/',
        tags: ['headless', 'react', 'mui'],
    },

    // ═══ REAL-APP INSPIRATION ══════════════════════════════════════════════
    {
        slug: 'mobbin',
        name: 'Mobbin',
        url: 'https://mobbin.com',
        domain: 'mobbin.com',
        category: 'inspiration',
        featured: true,
        tagline: '500K+ screens from real iOS, Android & web apps — pattern research central',
        description:
            'The screenshot library of shipping products: browse by app, screen type or UI element (onboarding, paywalls, empty states, settings) across iOS, Android and web. Free tier with daily view limits; pro unlocks the full library and filters. The answer to "how do real apps do this screen?"',
        stack: ['Design reference'],
        pricing: 'FREE + PRO',
        bestFor: ['Onboarding flows', 'Paywalls', 'Settings screens', 'Empty states'],
        highlights: [
            '500K+ curated screens from apps people actually use',
            'Element-level search — find just the toggles, just the paywalls',
            'Save collections for each project you\'re planning',
        ],
        search: { strategy: 'link' },
        searchUrl: 'https://mobbin.com/browse/ios/screens',
        tags: ['screens', 'patterns', 'mobile'],
    },
    {
        slug: 'refero',
        name: 'Refero',
        url: 'https://refero.design',
        domain: 'refero.design',
        category: 'inspiration',
        tagline: 'The giant web/app design reference — search any product, see every screen',
        description:
            'A massive tagged gallery of web and mobile product screenshots, searchable by product or pattern. Where Mobbin curates, Refero indexes — enormous coverage when you need options, fast.',
        stack: ['Design reference'],
        pricing: 'FREE',
        bestFor: ['Pattern hunting', 'Competitor screens', 'Web app references'],
        highlights: [
            'Huge breadth of products, including niche ones',
            'Search by flow type and product category',
            'Free to browse',
        ],
        search: { strategy: 'link' },
        searchUrl: 'https://refero.design/',
        tags: ['screens', 'reference'],
    },

    // ═══ TASTE GALLERIES ═══════════════════════════════════════════════════
    {
        slug: 'awwwards',
        name: 'Awwwards',
        url: 'https://www.awwwards.com',
        domain: 'awwwards.com',
        category: 'galleries',
        tagline: 'The awards podium of web design — study the absolute ceiling',
        description:
            'The judged competition site of record. When you want to know the maximum possible ambition for a website — typography, motion, 3D, scroll craft — filter the winners and prepare to feel things about your own site.',
        stack: ['Design reference'],
        pricing: 'FREE',
        bestFor: ['Award-level craft', 'Motion & 3D references', 'Typography', 'Scroll experiences'],
        highlights: [
            'Professional jury scoring — winners genuinely represent the ceiling',
            'Filterable by tech (WebGL, Three.js…) and category',
            'Case-study level detail on nominated sites',
        ],
        search: { strategy: 'link' },
        searchUrl: 'https://www.awwwards.com/websites/',
        tags: ['awards', '3d', 'motion'],
    },
    {
        slug: 'godly',
        name: 'Godly',
        url: 'https://godly.website',
        domain: 'godly.website',
        category: 'galleries',
        tagline: 'Astronomically good web design — the taste-filtered gallery',
        description:
            'A sharply-curated feed of exceptional websites with a strong editorial eye — less "every decent SaaS page", more "sites that made a designer screenshot them". The place to build taste.',
        stack: ['Design reference'],
        pricing: 'FREE',
        bestFor: ['Editorial picks', 'Portfolio sites', 'Brutalist & experimental', 'Vibe hunting'],
        highlights: [
            'Curation over volume — high hit-rate per scroll',
            'Tags like brutalist/y2k/minimal make vibe-hunting easy',
            'Includes the tasteful weird stuff other galleries skip',
        ],
        search: { strategy: 'link' },
        searchUrl: 'https://godly.website/',
        tags: ['curated', 'editorial', 'vibes'],
    },

    // ═══ ICONS ═════════════════════════════════════════════════════════════
    {
        slug: 'lucide',
        name: 'Lucide',
        url: 'https://lucide.dev',
        domain: 'lucide.dev',
        category: 'icons',
        featured: true,
        tagline: '1,500+ clean open-source icons — the default of the Tailwind era (this app uses them)',
        description:
            'The community fork of Feather with thousands more icons, already wired into shadcn and most modern stacks (lucide-react is in this very project). Consistent stroke weight, searchable site, tree-shakeable packages.',
        stack: ['SVG', 'React', 'Vue', 'Web', 'Flutter'],
        pricing: 'FREE',
        license: 'ISC (Feather-like)',
        install: 'npm i lucide-react',
        bestFor: ['App icons', 'UI chrome', 'shadcn projects', 'Consistent stroke sets'],
        highlights: [
            'The icon set shadcn/ui ships with — zero integration friction',
            '1,500+ icons at one consistent 24px stroke',
            'Packages for web, react, vue, svelte, flutter and more',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://lucide.dev/sitemap.xml', bingFallback: true },
        searchUrl: 'https://lucide.dev/icons/',
        tags: ['stroke', 'default', 'react'],
    },
    {
        slug: 'iconify',
        name: 'Iconify',
        url: 'https://icon-sets.iconify.design',
        domain: 'iconify.design',
        category: 'icons',
        tagline: 'Every open-source icon set (200k+ icons) in one searchable interface',
        description:
            'The meta-search of open icon sets: 200,000+ icons from Lucide, Tabler, Phosphor, Material, Carbon and hundreds more, searchable in one box, copyable as SVG/JSX, usable via one package or CDN. If it exists open-licensed, it\'s here.',
        stack: ['SVG', 'Everything', 'CDN'],
        pricing: 'FREE',
        license: 'Per-set (all open)',
        install: 'npm i @iconify/react',
        bestFor: ['Finding any icon ever', 'Mixing sets safely', 'CDN usage', 'SVG/JSX copy'],
        highlights: [
            'One search box across 200K+ icons from every open set',
            'Copy as SVG, JSX or use the on-demand component',
            'License info surfaced per set',
        ],
        search: { strategy: 'link' },
        searchUrl: 'https://icon-sets.iconify.design/?query={q}',
        tags: ['meta-search', 'all-sets'],
    },

    // ═══ SPECIALIZED ENGINES ═══════════════════════════════════════════════
    {
        slug: 'mapcn',
        name: 'mapcn',
        url: 'https://mapcn.vercel.app',
        domain: 'mapcn.vercel.app',
        category: 'tools',
        tagline: 'Beautiful maps made simple — accessible MapLibre components styled with Tailwind, shadcn-compatible',
        description:
            'The component layer that makes a map look designed: beautifully crafted, accessible map components built on MapLibre GL, styled with Tailwind CSS and made to work with shadcn/ui. Where MapLibre (next entry) is the engine, mapcn is the finished interior — pre-styled markers, popups, controls and map shells that drop straight into a modern React app. This is the look the owner\'s campus-guide map has.',
        stack: ['MapLibre GL', 'React', 'Tailwind', 'shadcn-style'],
        pricing: 'FREE',
        install: 'Copy & paste / shadcn-style registry',
        bestFor: ['Designed map UI', 'Markers & popups', 'Map controls', 'shadcn apps with maps'],
        highlights: [
            'Built on MapLibre GL — the same engine as the owner\'s campus guide',
            'Accessible and customizable, styled with Tailwind, works with shadcn/ui',
            'The fastest route to a map that looks custom-designed instead of default',
        ],
        search: { strategy: 'link' },
        searchUrl: 'https://mapcn.vercel.app/',
        tags: ['maps', 'maplibre', 'shadcn', 'tailwind'],
    },
    {
        slug: 'maplibre',
        name: 'MapLibre GL',
        url: 'https://maplibre.org',
        domain: 'maplibre.org',
        category: 'tools',
        tagline: 'The open vector-tile map engine — the one the campus guide uses',
        description:
            'MapLibre GL is the open-source descendant of Mapbox GL: GPU-rendered vector-tile maps with pitch, bearing, custom styles and smooth-fly camera work — the reason a map can look designed instead of default. Spotted in the owner\'s own campus-guide project (maplibre-gl 5.x), which is exactly how sites earn a shelf here. BSD-licensed with no per-load billing.',
        stack: ['WebGL', 'JS/TS', 'React wrappers'],
        pricing: 'FREE',
        license: 'BSD-2-Clause',
        install: 'npm i maplibre-gl',
        bestFor: ['Custom-styled maps', 'Campus/guide maps', 'Vector tiles', 'No per-load billing'],
        highlights: [
            'The engine behind the owner\'s campus guide (Desktop project)',
            'GPU vector rendering — pitch, rotate, fly-to camera moves (the 3D tilt view the campus guide has)',
            'Pair it with mapcn (previous entry) for the ready-made beautiful component layer',
            'Open source and self-hostable — your tiles, your rules',
            'Style with Mapbox-GL-compatible style JSON or Maputnik editor',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://maplibre.org/sitemap.xml', bingFallback: true },
        searchUrl: 'https://maplibre.org/',
        tags: ['maps', 'webgl', 'vector-tiles'],
    },
    {
        slug: 'tweakcn',
        name: 'TweakCN',
        url: 'https://tweakcn.com',
        domain: 'tweakcn.com',
        category: 'tools',
        tagline: 'Visual shadcn/ui theme editor — drag sliders, paste generated CSS variables',
        description:
            'A visual theme editor for shadcn/ui: tune radius, chart colors and full palettes with live component previews, then export the CSS variables straight into your globals. The fastest path from "default shadcn gray" to a brand.',
        stack: ['shadcn/ui', 'CSS variables'],
        pricing: 'FREE',
        bestFor: ['shadcn theming', 'Brand palettes', 'Dark-mode tuning'],
        highlights: [
            'Live preview of real shadcn components as you tweak',
            'Exports exactly the CSS variables shadcn expects',
            'One-click presets to bootstrap a direction',
        ],
        search: { strategy: 'sitemap', sitemapUrl: 'https://tweakcn.com/sitemap.xml' },
        searchUrl: 'https://tweakcn.com/',
        tags: ['shadcn', 'themes', 'css-vars'],
    },
];

// ─── Helpers (used by pages, nav & the search API) ────────────────────────────

export function getSiteBySlug(slug: string): ComponentSite | undefined {
    return COMPONENT_SITES.find((s) => s.slug === slug);
}

export function categoryById(id: DirectoryCategoryId): DirectoryCategory {
    return DIRECTORY_CATEGORIES.find((c) => c.id === id) ?? DIRECTORY_CATEGORIES[0];
}

/** Featured picks first, then the owner's rough priority order (categories). */
export const ORDERED_SITES: ComponentSite[] = [...COMPONENT_SITES].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return 0;
});

/** Live-searchable sites in query order (sitemap first, then prioritized Bing). */
export function liveSearchSources(): ComponentSite[] {
    const sitemap = COMPONENT_SITES.filter((s) => s.search.strategy === 'sitemap');
    const bing = COMPONENT_SITES.filter((s) => s.search.strategy === 'bing').sort(
        (a, b) => (a.search.priority ?? 99) - (b.search.priority ?? 99),
    );
    return [...sitemap, ...bing];
}

/** Google's favicon service — renders a site's real icon client-side. */
export function faviconFor(domain: string, size = 64): string {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

/** Resolve a site's deep searchUrl template with the user's query. */
export function resolveSearchUrl(site: ComponentSite, query: string): string {
    return site.searchUrl.includes('{q}')
        ? site.searchUrl.replace('{q}', encodeURIComponent(query))
        : site.searchUrl;
}
