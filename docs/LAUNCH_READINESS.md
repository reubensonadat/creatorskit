# CreatorKit — Launch Readiness Audit

> **Audited:** 2026-10-07 · **Verdict: 8 / 10 — launch-ready after ONE change** (soften the adblock wall)
> **Domain decision: YES — buy `creatorskit.win` now.** The whole product already canonically points there.

---

## 1. Ads — where they should show (desktop vs mobile)

### What exists today

| Piece | File | State |
|---|---|---|
| Ad slot placeholder (leaderboard / rectangle / sidebar) | [`AdBanner.tsx`](../src/components/AdBanner.tsx:8) | AdSense-ready contract, no live unit |
| Desktop sidebar 300×250 + collapsible sponsor panel on every embedded tool | [`ToolLayout.tsx`](../src/components/ToolLayout.tsx:198) | Placeholder, collapsible ✅ |
| Mobile sponsored interstitial for external links + once-per-session banner | [`ExternalAdGate.tsx`](../src/components/ExternalAdGate.tsx:66) | Live (in-house cross-promos) |
| Rewarded-ad countdown flow | [`video-grabber/page.tsx`](../src/app/video-grabber/page.tsx:1057) | Live pattern, AdSense-ready slot |
| Blog placements (top, in-content ×2, sidebar ×2, bottom) | [`blog/[slug]/page.tsx`](../src/app/blog/[slug]/page.tsx:576) | Placeholders |
| Adblock full-screen wall | [`AdBlockDetector.tsx`](../src/components/AdBlockDetector.tsx:64), mounted in [`ClientLayout.tsx`](../src/components/ClientLayout.tsx:38) | ⚠️ **Remove before launch** |

### The ruling principle (matches the privacy policy's own promise)

The privacy policy already tells users exactly the right thing ([`privacy/page.tsx`](../src/app/privacy/page.tsx:114)):
*"Advertising appears only in reserved slots on free pages — never inside a tool's workflow before an export, and never blocking your file."*
The ad plan below enforces that promise. Deviating from it = lying to users.

### Placement matrix

| Surface | Desktop | Mobile | Why |
|---|---|---|---|
| Tool pages (`/compressor`, `/text-behind`, …) | Sidebar 300×250 (ToolLayout) + one leaderboard **below** the tool, above FAQ | **Nothing until export completes** → then one banner on the success screen | Export moment = natural pause, user is satisfied, zero workflow interruption |
| `/blog` + `/blog/[slug]` | Full monetization: top leaderboard, in-content rectangles, bottom | Same, in-content only | Articles = content surfaces; readers expect ads |
| `/` landing | One leaderboard below the fold (or none at all) | Same or none | First impression must stay clean — that IS the brand |
| `/video-grabber` | Existing rewarded countdown | Existing rewarded countdown | Already the correct pattern |
| `/teleprompter`, `/teleprompter/mirror`, `/bouquet/[id]`, `/r/[id]`, `/app`, `/your-data`, `/privacy`, `/terms`, `/admin` | **Never** | **Never** | Fullscreen immersive tools, shared/emotional moments (bouquets), legal pages, share links |
| Modals, CategorySheet, export dialogs | **Never** | **Never** | Inside-workflow = the explicit promise we made |

### ⚠️ The one thing to change before launch

[`AdBlockDetector.tsx`](../src/components/AdBlockDetector.tsx:64) renders a **full-screen blocking wall** — on a site that currently serves **zero real ads**. Consequences:

1. It blocks first impressions for adblock users while protecting nothing (there is no revenue to protect yet).
2. During AdSense review, a reviewer with an adblocker hits a wall before seeing any content — a needless site-quality risk.
3. It directly contradicts "keep our clean look."

**Fix (recommended, 1 line):** stop mounting it in [`ClientLayout.tsx:38`](../src/components/ClientLayout.tsx:38) until real AdSense units ship; or downgrade it to a small dismissable toast. Re-enable the wall (if ever) only after ads are live and only as a non-blocking banner.

### How the money actually flows (the exact moments ads fire)

The one rule that balances revenue vs. usability:

> **Ads fire at PAUSE points (job done, waiting, reading) — NEVER at ACTION points (uploading, editing, clicking a tool button).**

Answering the direct question: **when a user clicks a tool button, NO ad appears.** Ever. Here's why that's the profitable answer, not just the polite one:

1. **AdSense bans it.** Ads placed to catch accidental clicks during interaction = invalid traffic = account termination. One ban is near-permanent.
2. **Retention is the asset.** A creator who leaves after one session is worth ~$0.02 in ads. A creator who returns weekly is worth 50× that over a year — and shares the tool. Interruption ads kill the second user.
3. **Impressions pay, not tricks.** Display ads pay per 1000 views (RPM) + genuine clicks. Volume × natural exposure is the model — forcing exposure is not needed.

**The 4 monetization moments in a real user journey:**

| Moment | What the user experiences | Where it exists |
|---|---|---|
| **1. Page load (passive)** | Desktop: sidebar 300×250 sits beside the tool the whole session — thousands of impressions, zero interruptions. Mobile: nothing above the fold. | [`ToolLayout.tsx`](../src/components/ToolLayout.tsx:198) ✅ built |
| **2. Export success (the golden slot)** | "✅ Your file is ready" screen → one banner below the download button. User is satisfied, paused, and will look at anything. Highest viewability on the site. | Video-grabber pattern ✅; extend to other tools |
| **3. Rewarded unlock (the real earner)** | "Out of cloud uses? Watch a short ad → +1 transcription/grab." User *chooses* to watch — highest ad engagement that exists, converts our server cost into revenue. | [`video-grabber/page.tsx:1057`](../src/app/video-grabber/page.tsx:1057) ✅ live pattern |
| **4. Blog reading (highest RPM)** | In-article ads while reading "How to put text behind image" — readers spend 3–5 min on the page; content ads pay 2–4× tool-page RPM. | [`blog/[slug]/page.tsx`](../src/app/blog/[slug]/page.tsx:576) ✅ slots ready |

**Realistic revenue math (AdSense display, creator-tool niche):**

| Monthly sessions | Est. monthly ad revenue | Notes |
|---|---|---|
| 10,000 | ~$10–40 | Global EN traffic; blog share raises it |
| 100,000 | ~$150–500 | Sidebar + success-screen + blog compounding |
| 1,000,000 | ~$2,000–6,000 | Rewarded unlock becomes a meaningful share |

Reality check: ads alone never make this rich — they make it **free forever with zero user-data compromise**, which *is* the moat (business plan §3). The actual business money is Layer 2 (Pro $7/mo), and ads are what let us keep the free tier generous enough to dominate search results. That's the balance: **ads fund "free", Pro funds the company, and neither ever touches the tool workflow.**

### Google Ads ordering (important)

"Google Ads" can mean two things — only one is right for us now:

- ✅ **AdSense (display, earns money):** apply AFTER the domain is live with real content. Order: buy domain → deploy → Search Console + sitemap → apply → on approval add `ads.txt` + swap real `<ins class="adsbygoogle">` units into the existing slot contract. Our privacy policy §9 already discloses AdSense cookies — approval requirement met.
- ❌ **Google Ads (paid acquisition):** No. The business plan's growth engine is organic search + share loops, zero paid acquisition. Don't spend there pre-revenue.

---

## 2. Notifications — should we integrate?

### Current state

- [`sw.js`](../public/sw.js:1) has **no `push` listener and no `notificationclick` handler** → Web Push is not wired.
- No accounts, no server-side user data — by design (privacy moat, business plan §0: *"count events, never people"*).
- In-app toasts already exist everywhere (`Toaster`, export progress toasts).
- The "handoff handler" ([`tool-handoff.ts`](../src/lib/tool-handoff.ts:1)) is a cross-tool **image** handoff (IndexedDB), unrelated to OS notifications.

### Verdict: SKIP web push for v1. LOW importance at this stage.

| Reason | Detail |
|---|---|
| Wrong problem | Notifications solve **retention**. We have zero users; our bottleneck is discovery (SEO), not retention. |
| iOS friction | Web push on iOS only works for home-screen-installed PWAs (iOS 16.4+). Our traffic is casual SEO visits. |
| Contradicts the moat | Push requires stored subscriptions + a send service = server-side user data. Our privacy policy and business model are built on holding none. |
| Cost with no return | Needs backend infra (VAPID keys, subscription storage, send jobs) before a single user asked for it. |

### The one exception worth building (cheap, zero-infra, genuinely useful)

**Local "export complete" notifications** for long-running jobs (match-cut video export, auto-captions, video grab): when `document.hidden` is true and a render finishes, fire the plain browser `Notification` API (permission asked **in context**, at the moment the user starts a long export). No push server, no stored data, real utility — creators tab away during renders. This is the only notification v1 needs. Revisit web push after 1,000 MAU *and* only if a server-side feature (cloud transcription queue) genuinely requires it.

---

## 2.5 AdSense approval checklist — do we meet the requirements?

Yes — on content and policy, we meet every single one. The only unmet requirement is the domain itself being live and indexed, which the purchase fixes.

| AdSense requirement | Our status | Evidence |
|---|---|---|
| Own domain, site live with content (not a bare subdomain) | ❌ **The only gap** | `creatorskit.pages.dev` exists but canonical is [`creatorskit.win`](../src/lib/seo.ts:12) — buy + point + deploy first |
| Enough original, useful content (the "few blogs" requirement) | ✅ **Exceeds it** | 13 hand-written posts ([`blog-posts.ts`](../src/data/blog-posts.ts:61) — 850 lines, 8-min reads with tables, checklists, structured sections) + 25 tool pages each with how-to/FAQ content. Typical approval bar is ~20–30 quality pages; we ship ~40 |
| Privacy policy disclosing ads + ad-network cookies | ✅ | [`privacy/page.tsx`](../src/app/privacy/page.tsx:111) §9 already names Google AdSense and its cookies explicitly |
| About page telling who runs the site | ✅ | [`about/page.tsx`](../src/app/about/page.tsx:1) — real story, real founder, real promises |
| Reachable contact method | ✅ | Email on all three policy pages ([about](../src/app/about/page.tsx:71), privacy, terms) — a working Gmail is fully acceptable |
| Terms of service / disclaimers | ✅ | [`terms/page.tsx`](../src/app/terms/page.tsx:1) |
| Clear site navigation | ✅ | Navbar + tool sidebar + footer + sitemap |
| Supported language | ✅ | English throughout |
| No prohibited/copyright content | ✅ | 100% original tools + writing; Unsplash images properly used |
| No "under construction" / thin pages | ✅ | 54 routes all complete (build verified) |
| Site indexed in Search Console first | ⚠️ sequencing | Submit sitemap day one; **wait ~1–2 weeks of indexing before applying** — measurably improves approval odds |
| Reviewer UX (no walls/interstitials) | ⚠️ | Remove the [`AdBlockDetector`](../src/components/AdBlockDetector.tsx:64) wall before applying |
| ads.txt | after approval | Add on day one of approval |

**Two optional polish items:** blog bylines use a branded name ("CreatorsKit Africa Business Lab") — a real human author byline reads better to reviewers; and self-hosted cover images are marginally better than hotlinked Unsplash.

**Bottom line:** content-wise we are over-qualified for AdSense. Sequence: buy domain → deploy → Search Console + sitemap → remove adblock wall → wait ~2 weeks of indexing → apply.

## 3. Launch readiness — the scorecard

### ✅ What's genuinely ready (this is a lot)

| Area | Evidence |
|---|---|
| **Build health** | `next build` compiles clean — 54 routes, static/SSG generation working |
| **SEO machinery** | Best-in-class for a tool site: keyword factory (200+ keywords/page), JSON-LD builders, per-tool metadata ([`seo.ts`](../src/lib/seo.ts:1)), `sitemap.xml` + `robots.txt` generated, canonical domain consolidated |
| **PWA** | Manifest with app shortcuts ([`manifest.ts`](../src/app/manifest.ts:1)), service worker with offline fallback + SWR caching, install prompt |
| **Legal / trust** | Privacy policy with full AdSense §9 disclosure, Terms, `/your-data` self-service viewer — exceeds AdSense approval requirements |
| **Content** | 13 blog posts SSG-prerendered, keyword-targeted |
| **Monetization plumbing** | Ad slot contract (leaderboard/rectangle/sidebar) consistently implemented across ToolLayout, blog, video-grabber, demystify |
| **Mobile QA** | Extensive mobile audits already run (320px probes, tap tests, width sweeps in `scratch/`) |
| **Business clarity** | Failure-mode-audited business plan, revenue stack ordered, validation gates defined |

### ⚠️ What holds it back from 10

| Gap | Weight | Action |
|---|---|---|
| Adblock full-screen wall on a site with no ads | **-1.0** | Unmount in ClientLayout (pre-launch blocker) |
| No live monetization (AdSense not applied, no `ads.txt`) | -0.5 | Correct to do AFTER domain live — not a blocker, just sequencing |
| Zero real-traffic validation (all QA is local/synthetic) | -0.5 | Only launch fixes this — deploy and submit sitemap |

### 🏁 **Score: 8 / 10**

Ready to launch **now** with the adblock wall removed. The remaining 2 points are things only a live site can earn (AdSense approval, real-user validation), not things to build first.

---

## 4. Domain: buy `creatorskit.win`? — **YES**

1. **The product already committed to it.** Every canonical URL, sitemap entry, JSON-LD node, and OG tag points at `https://creatorskit.win` ([`seo.ts:12`](../src/lib/seo.ts:12)); the brand, strategy doc, manifest, and blog all say CreatorKit. Changing now costs far more than any TLD concern.
2. **SEO impact of `.win` is neutral.** Google ranks TLDs neutrally; content + intent win. The site targets long-tail tool keywords where the TLD is irrelevant.
3. **Minor caveats (not blockers):** `.win` is cheap (~$20–30/yr), which attracts some spam elsewhere (mainly an email-deliverability stereotype — irrelevant for a tools site). Register for **2+ years**, enable auto-renew + registrar lock, and keep WHOIS privacy on.
4. **Optional later (do NOT block launch):** grab `creatorskit.app` for the installed-PWA audience when budget allows.

---

## 4.5 Update 2026-10-07 — implemented (all build-verified)

- ✅ Domain `creatorskit.win` **purchased**
- ✅ Host consolidation: [`src/middleware.ts`](../src/middleware.ts) 308-redirects `creatorskit.pages.dev`, `www.`, and any stray host → apex (previews + localhost exempt)
- ✅ Adblock full-screen wall → **non-blocking toast** ([`AdBlockDetector.tsx`](../src/components/AdBlockDetector.tsx))
- ✅ Homepage canonical + `public/robots.txt` synced with sitemap line + `/admin` `/api` disallow
- ✅ **ONE ad banner site-wide** (owner ruling2026-10-07): a single right-side 300×600 rail in ToolLayout, CSS-gated to ≥1600px viewports. Below 1600px — laptops, tablets, phones — zero ads in tools
- ✅ **Sidebar expansion OVERLAYS** the workspace instead of squishing content (fixed 52px lane + absolute expanding panel in ToolLayout)
- ✅ **SiteNav dropdown portaled to `<body>`** with fixed coords + max z-index — the Tools menu can never render behind page UI again, on any fullscreen tool
- ✅ Homepage "Open the App" button text → white on black
- ✅ Homepage **below-fold leaderboard** (the single `/` ad slot)
- ✅ **`/redirect` mobile fix** — the desktop-only 3-column grid now stacks below 900px, skyscrapers hide, paddings tighten below 640px
- ✅ **Google Analytics 4 wired** — `@next/third-parties` in root layout, env-gated `NEXT_PUBLIC_GA_ID` (live ID set in `.env.local`), Consent Mode v2 defaults DENIED via inline pre-GA script
- ✅ **Consent banner (Accept/Deny)** — [`ConsentGate.tsx`](../src/components/ConsentGate.tsx) + [`consent.ts`](../src/lib/consent.ts). Accept → GA/ads cookies on; Deny → nothing stored, tools unaffected. GA setup answer: **"I use a custom consent banner."** Accept/deny ratio readable in GA4 Reports → Admin → Consent Overview (cookieless pings)
- ✅ **ToolSeoBlock pattern shipped** — crawlable long-form content (features/steps/FAQ/internal links) below the tool UI, starting with match-cut. This IS the "description page" strategy: depth on the real URL, no thin duplicate routes
- ✅ Privacy policy updated for GA4 + consent banner (§7, §8)

### Competitor benchmark (owner research 2026-10-07)
textmatchcut.app (single-tool site, @lehelhanko): 955K Google clicks / 1.59M impressions in Sept → €390 AdSense (~€130/day peak). **Lesson:** a single generator tool with an exact-match domain can win its own keyword. CreatorsKit's match-cut has MORE features — the ToolSeoBlock content + per-tool metadata is how we contest that exact query; every flagship tool should get its own block.

- Remaining dashboard steps (not code): point domain at Cloudflare Pages project, submit sitemap to Search Console, apply to AdSense after ~2 weeks indexed

**Revenue target reality check (owner goal: $100–300/mo):** at typical creator-tool AdSense RPMs this needs roughly **30–100k sessions/month** — reachable in months 3–6 if 2–3 tools hit page-one for their long-tail keywords; the rewarded-ad flow in video-grabber accelerates it.

## 5. Launch sequence (exact order)

1. Buy `creatorskit.win` → point at Cloudflare Pages (already serving `*.pages.dev`).
2. Unmount [`AdBlockDetector`](../src/components/ClientLayout.tsx:38) (or downgrade to toast).
3. Verify ad placements match the matrix in §1 (no ads inside tool workflows or fullscreen tools).
4. Deploy → submit `sitemap.xml` to Google Search Console + Bing Webmaster.
5. Apply for **AdSense** (privacy policy already compliant).
6. On approval: add `ads.txt`, swap real units into the existing slot contract, THEN optionally re-enable a soft adblock notice.
7. Skip web push. Optionally add local export-complete notifications.
8. Start the Phase-5 growth loops (Product Hunt, Reddit, X thread) once Search Console shows indexing.
