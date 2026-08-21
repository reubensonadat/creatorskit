# CreatorKit.win — Master Strategy Document

> **Last Updated:** 2026-08-16  
> **Status:** Active · Pre-Launch (Phase 0)

---

## 🎯 Mission

**Give every creator on Earth access to powerful, professional-grade tools — free, instant, and right in their browser.**

No downloads. No subscriptions. No learning curve. Just upload, do the thing, download. We build the tools that used to require a $50/month Adobe subscription and make them available to the 17-year-old Instagrammer, the small business owner making reels, and the YouTuber who just started. We make them feel premium enough that they'd pay — and then we give them away for free.

---

## 🌍 Vision

**CreatorKit.win becomes the go-to browser toolkit for social media content creation.**

In 18 months:
- 100,000+ monthly active users
- Top-3 Google ranking for "text behind image tool", "free carousel slicer", "online teleprompter" and similar high-intent keywords
- Monetized via display ads + a lightweight Pro tier ($5–9/month)
- Domain authority built entirely through free tools + SEO — zero paid acquisition

The endgame is a **self-sustaining micro-SaaS** that runs on Vercel, generates passive ad income, and grows through organic search and social shareability.

---

## 🏗️ Product — The 4 Core Tools (v1.0)

| # | Tool | What It Does | Why It's Searched |
|---|---|---|---|
| 1 | **Text Behind Image** | Layers text behind a photo subject using AI background removal | "text behind image effect" — viral on Instagram/YouTube |
| 2 | **Carousel Slicer** | Splits one wide image into Instagram carousel slides | Every carousel creator needs this |
| 3 | **Studio Teleprompter** | Full-screen scrolling script reader with mirror mode | Every video creator needs this |
| 4 | **Image Compressor** | Drag & drop compress to JPEG/WebP with live size preview | Massive evergreen search volume |

All tools run **100% in the browser** — no backend, no server costs, no user data collected.

---

## ⚙️ Technical Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSG for landing pages = SEO gold |
| Language | TypeScript | Type safety from day one |
| Styling | Tailwind CSS | Rapid, consistent UI |
| Animation | Framer Motion | Premium feel on interactions |
| AI (in-browser) | `@imgly/background-removal` | WASM — zero server cost |
| Export | `html-to-image`, `jszip` | Client-side file generation |
| Hosting | Vercel (free tier) | Zero DevOps, global CDN |
| Analytics | Vercel Analytics + Plausible | Privacy-respecting, GDPR safe |
| Ads | Google AdSense | Revenue from day 1 of traffic |

---

## 🪜 Build Philosophy — Small Steps, Constant Refinement

> **"Ship ugly, refine to beautiful."**

We do NOT build a perfect tool and launch. We iterate in tiny, deliberate steps:

### Atomic Build Cycle (Per Feature)
```
1. Skeleton UI (layout shell, no logic)         → commit
2. Core logic (the tool actually works)         → commit
3. Design pass (colors, spacing, typography)    → commit
4. Polish pass (animations, micro-interactions) → commit
5. Edge cases (error states, mobile layout)     → commit
```

### UI Refinement Principles
- Every button has a hover state and a press state
- Every action gives visual feedback (loading spinners, success flashes)
- Typography is always Inter — never browser default
- Dark mode IS the product — not a toggle
- Mobile-first — 80% of creator traffic is mobile
- No dead pixels — every element communicates or breathes

---

## 🚦 Phase Roadmap

### Phase 0 — Foundation (Week 0)
- [x] Strategy document written
- [ ] Next.js project fully initialized
- [ ] Design system: globals.css, Tailwind config, color tokens
- [ ] Root layout + Navbar component
- [ ] Favicon, OG image, site metadata

### Phase 1 — First Two Tools (Week 1)
- [ ] Teleprompter — full feature build + design polish
- [ ] Image Compressor — full feature build + design polish
- [ ] Deploy to Vercel, domain connected (creatorkit.win)
- [ ] Placeholder landing page (cards for all 4 tools)

### Phase 2 — Flagship Tools (Week 2)
- [ ] Carousel Slicer — with zip export
- [ ] Text Behind Image — AI removal + draggable text + export
- [ ] Full landing page with live previews

### Phase 3 — SEO & Content (Week 3)
- [ ] H1, meta descriptions, FAQ schema per tool page
- [ ] `/blog` route with 3–5 keyword-targeted articles
- [ ] Sitemap submitted to Google Search Console
- [ ] OG preview images per tool (auto-generated)

### Phase 4 — Monetization (Week 4–6)
- [ ] Google AdSense integrated (non-intrusive placements)
- [ ] Pro tier defined and gated
- [ ] Stripe integration ($7/mo or $49/yr)

### Phase 5 — Growth Loops (Month 2–3)
- [ ] Subtle watermark on free exports → social viral loop
- [ ] "X images processed" social proof counter
- [ ] Product Hunt launch
- [ ] Reddit posts: r/SideProject, r/Entrepreneur, creator subs
- [ ] Twitter/X launch thread

---

## 💰 Monetization Strategy

> **The tools are free. Forever. No paywalls, no watermarks, no sign-ups.**
> Revenue comes from people visiting — not from charging them.

### Tier 1: Display Advertising (Month 1+)
- Google AdSense placements: sidebar (desktop), between tool + results (mobile)
- Non-intrusive — never interrupt the tool workflow
- At 10k sessions/month → ~$30–80/month
- At 100k sessions/month → ~$300–800/month passive
- At 1M sessions/month → ~$3,000–8,000/month

### Tier 2: Affiliate Links (Month 3+)
- Relevant creator tool recommendations in blog content
- e.g. "Need more advanced editing? Try [X]" with affiliate link
- Only recommend things that genuinely add value

### Tier 3: Newsletter + Sponsored Content (Month 6+)
- Build an email list from tool users
- Occasional sponsored newsletters to creator audiences
- Only once the audience is real and engaged

### What we will NEVER do
- No subscriptions
- No paywalls on any tool
- No watermarks on exports
- No account required
- No "upgrade to unlock" friction

The free experience IS the product. Period.

---

## 📈 SEO & Traffic Strategy

### Primary Keyword Targets
| Keyword | Est. Volume | Competition |
|---|---|---|
| text behind image free online | 8,100/mo | Low |
| free online teleprompter | 22,000/mo | Medium |
| image compressor online free | 60,500/mo | Medium |
| instagram carousel slicer | 2,400/mo | Very Low |
| split image for instagram carousel | 3,600/mo | Low |

### On-Page SEO (Every Tool Page)
- Unique `<title>` + `<meta description>` per page
- One `<h1>` matching exact primary keyword
- How-to guide (3–5 steps with images) below the tool
- FAQ section with FAQ schema markup
- Canonical URL set
- OG image per tool

### Content Calendar
**Month 1:**
1. "How to Put Text Behind Image — Free, No Photoshop"
2. "How to Make an Instagram Carousel from One Image"
3. "Best Free Online Teleprompter Tools Compared"

**Month 2:**
4. "How to Compress Images Without Losing Quality"
5. "Instagram Carousel Size Guide 2026"
6. "YouTube Thumbnail: Text Behind Image Effect Tutorial"

### Backlink Strategy
- Submit to: Product Hunt, Hacker News (Show HN), Indie Hackers
- Free tool listings: AlternativeTo, SaaSHub, Futurepedia

---

## 🎨 Brand Identity

| Element | Value |
|---|---|
| Name | CreatorKit.win |
| Tagline | "Your browser. Your studio." |
| Primary Color | `#7c3aed` (violet) |
| Background | `#09090b` (deep obsidian) |
| Font | Inter (Google Fonts) |
| Tone | Sharp, confident, creator-native |

---

## 📐 Design System Tokens

```css
--bg-base:     #09090b;   /* Page background */
--bg-surface:  #18181b;   /* Card / panel */
--bg-elevated: #27272a;   /* Input / slider track */
--bg-border:   #3f3f46;   /* Subtle borders */

--text-primary: #ffffff;
--text-muted:   #a1a1aa;
--text-hint:    #71717a;

--accent:       #7c3aed;
--accent-light: #8b5cf6;
--accent-glow:  rgba(124, 58, 237, 0.3);

--success: #22c55e;
--warning: #f59e0b;
--error:   #ef4444;
```

---

## ✅ Definition of Done (Per Tool)

- [ ] Works on desktop Chrome, Firefox, Safari
- [ ] Works on iOS Safari + Android Chrome
- [ ] All edge cases handled (empty, wrong format, oversize)
- [ ] Exports produce correct output files
- [ ] Full SEO metadata on the page
- [ ] Loading + error states are designed, not just functional
- [ ] Lighthouse score ≥ 90 on Performance, Accessibility, Best Practices

---

## 📌 Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Hosting | Vercel | Zero-cost, instant deploys, global CDN |
| AI processing | Client-side WASM | No server costs, privacy-first |
| Auth | None (v1) | Reduce friction |
| Database | None (v1) | No accounts needed yet |
| Domain | creatorkit.win | Short, memorable, creator TLD |
| Monetize order | Ads first → Pro | Ads work at low traffic; Pro needs trust |

---

*This document is the source of truth. Update when decisions change.*
