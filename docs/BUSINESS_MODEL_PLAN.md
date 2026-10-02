# CreatorKit — Business Model Plan v2

> **Last Updated:** 2026-10-01
> **Status:** Active · Supersedes the "Monetization Strategy" section of `CREATORKIT_STRATEGY.md`
> **Trigger:** The "5 types of startups that die" framework — audited against CreatorKit, then answered with a model that survives all five.

---

## 0. TL;DR

**Monetize the workflow, never the tool. But first: prove anyone wants the workflow.**

- **We have zero users today.** Stage 0 is launch + validation gates (§8) — no pricing page, no Stripe, no paid-feature work until ≥1,000 visits/month and real pull signals exist. The $7 tier is a build spec, not a day-one product.
- Every tool that runs **on-device** (WASM/worker) stays **free forever, no watermark** — its marginal cost is ~$0, so free is not generosity, it's a cost moat competitors with server farms can't match.
- Money is captured only where **real server cost exists** (cloud captions, video grab, model proxying) and where **value concentrates** (brand kit, project history, batch, hi-res, client-facing documents).
- The moat that answers "what gets stronger as it grows": the **Creator Passport** (one brand kit + history flowing across all 20+ tools, stored **on the user's device** — we hold zero server-side user data) and the **Benchmarks Engine** (anonymous aggregate counters — the Data Decision in §6).
- Revenue stack: **Ads (free tier) → Pro subscription + AI credits → data products** — in that order, one wedge at a time. No affiliate pillar (Space Planner post-mortem in §7).

---

## 1. The 5 Failure Modes — CreatorKit Audit

| # | Failure mode | CreatorKit exposure | Verdict |
|---|---|---|---|
| 1 | **Features pretending to be companies** — the platform copies your whole business in one update | Real for any *single* tool. A standalone carousel slicer is a button. BUT: we already lived this — YouTube bot-walled the Video Grabber server IP (`docs/VIDEO_GRABBER_HANDOFF.md` §8). We know the pain. | ⚠️ **Managed** — the suite + Passport (§5) is the defense. A platform can copy one tool; it cannot copy a 20-tool workflow that carries your fonts, presets, and history. |
| 2 | **Founders who don't understand the industry** | We ARE the user — creator-native, building tools we use. The Business Suite (MoMo/bank invoices, sponsorship agreements) shows real insight into how creators actually get paid, especially in our market (Ghana/Africa — expensive mobile data → the Compressor's "DATA SAVER" positioning is industry insight encoded as a feature). | ✅ **Strength** |
| 3 | **Marketplaces with no wedge** — subsidize both sides, burn cash | We have no marketplace. Future temptation: template/preset marketplace. | ✅ **Clear** — with a rule: no marketplace until a single category wins single-handedly (§7). |
| 4 | **Hardware economics** — every unit costs cash before the customer pays | Software analog: **server-metered AI**. Every cloud transcription, every video grab, every proxied model download costs real money *before* the user pays anything. Unmetered, our costs scale linearly with success — hardware economics in disguise. | ⚠️ **Managed** — credits + quotas (§4) + on-device-first rule: if it can run in a worker, it must. |
| 5 | **Push-only demand** — revenue exists only while you're pushing | Our traffic is **pulled by search intent** ("text behind image free online", "free online teleprompter") — the healthiest demand there is. Risk: demand for *free* is proven; demand for *paid* is not yet. | ✅ **Half-proven** — Pro tiers must validate on existing users, not on hope (§8 kill-criteria). |

**Score: we are not structurally doomed — but we are sitting on failure mode #6, which the video missed entirely.**

---

## 2. The 6th Failure Mode (our addition to the framework)

> **#6 — The Free Utility Trap: loved to death.**
>
> A product that dies *of success, not failure*. Usage grows, and because the founders never built a capture mechanism, hosting/AI bills grow in lockstep while revenue stays flat at $0. Traffic charts go up-and-to-the-right; the bank account goes down. Usage ≠ revenue. A free tool with no capture path isn't a company — it's a charity with server bills.
>
> **Symptoms:** traffic up, revenue flat, costs linear with usage, no page on the site where money can physically enter.
>
> **Antidote:** monetize where **cost is created** (server-side AI → credits) and where **value concentrates** (workflow, history, brand identity) — and never charge for what is free to serve.

CreatorKit today: AdBanner exists and a rewarded-ad flow exists in Video Grabber — but there is **no pricing page, no checkout, no account tier, no way for a happy user to give us money even if they wanted to**. That is failure mode #6, caught early. This plan is the antidote.

---

## 3. The Core Principle

**The tools are the top of the funnel. The workflow is the product. The data is the moat.**

Each layer maps to a question from the video:

| Video question | CreatorKit answer |
|---|---|
| *What gets stronger as it grows?* | Every new tool increases SEO surface, makes the Passport more useful, and feeds the Benchmarks Engine. The suite compounds; a single tool doesn't. |
| *Why can't someone bigger copy it?* | Canva/Notion/Adobe can copy any one tool in a sprint. They cannot copy (a) on-device-first cost structure that lets us keep everything free, (b) accumulated benchmark data, (c) a user's saved Passport + history. |
| *Who desperately needs it?* | The Business Suite user — a creator chasing invoices between brand deals. Freelancers with revenue have urgency and a willingness to pay that "fun tool" users don't. |
| *Does it get cheaper or more expensive with scale?* | On-device tools: cost per extra user ≈ $0 (cheaper with scale). Server AI: metered by credits so margin per user is fixed and positive by construction. |

---

## 4. Revenue Stack (3 layers, built in order)

### Layer 1 — Attention money (live now, free tier only)
- **Display ads** (`AdBanner.tsx`) — sidebar/in-feed, never inside the tool flow before export.
- **Rewarded ads** — the Video Grabber "watch one short ad → save the file" pattern generalized: any free user who exhausts a cloud-AI quota can watch an ad for +1 use. Turns cost overage into revenue.
- **Affiliate — opportunistic only, never a pillar.** Space Planner just proved that affiliate-on-top-of-a-tool does not carry a business (post-mortem in §7). Blog-content links at most; budget $0 expected revenue from them.
- **Rule:** Pro subscribers see zero ads. Ads fund free users; Pro users pay us directly. Classic double win.

### Layer 2 — Workflow money (the business model proper)
**Freemium SaaS + AI credits.** Free tier is generous and permanent. Pro pays for convenience, scale, and identity — never for the core function.

| Tier | Price | What's included |
|---|---|---|
| **Free** | $0 forever | All on-device tools, unlimited, no watermarks. Cloud-AI allowance: e.g. 3 cloud transcriptions + 5 video grabs / month, extendable by rewarded ads. |
| **Creator Pro** | **$7/mo · $60/yr** | 500 AI credits/mo (cloud captions, video grabs, priority model fetch). Hi-res/4K exports. Batch queues (watermark 100 images, slice 10 carousels). Project history ("Output Vault" — re-edit any past export). 3 brand kits. Ad-free. |
| **Studio** | **$19/mo · $180/yr** | Everything in Pro + 2,000 credits/mo. Unlimited brand kits. Client Workspace: custom-letterhead invoices, payment tracking, branded share links — the Business Suite unlocked as a freelancer's back office. Early access to new tools. |
| **Credit top-up** | $5 = 300 credits | Pay-as-you-go, never expires. For the heavy user who doesn't want a subscription. |

**Why these numbers:** $7 matches the original strategy's price point (no new decision needed), annual = 2 months free (cash up front, cuts churn), Studio at $19 stays under the "I don't have to think about it" threshold for earning freelancers.

**Storage principle (local-first):** the zero-user-data promise stays. Brand kits and project history live **on the user's device** (IndexedDB/localStorage). The only server storage is what a **signed-in paying user explicitly saves** (cloud sync across devices) — a Pro convenience that costs us money only while we're being paid. Free + anonymous = nothing stored, ever.

### Layer 3 — Data money (the splendid addition — see §6)
- **Creator Benchmarks reports** — free, published, citable. Monetized indirectly (SEO, backlinks, press) and later directly (custom benchmark API / "how does MY niche compare" for Pro).

---

## 5. The Moat — Creator Passport 🎫

> One anonymous-or-signed identity that carries **your stuff** into every tool.

- **Brand Kit:** logo, fonts, color palette, export presets, watermark signature. Set it once in any tool → Teleprompter, Text Highlighter, Match Cut, invoices, letterheads, watermarks all obey it.
- **Output Vault (local-first):** export history lives on the user's device — re-editable, zero server storage. Pro adds encrypted cloud sync across devices via Supabase (`supabase/schema.sql` already exists) — paid convenience, not a data grab.
- **Hand-off chains** already exist in spirit (`src/lib/tool-handoff.ts`, background-removal → other tools). The Passport formalizes them: cutout → text-behind → resizer → watermark in one flowing chain, with your kit applied at every step.

**Why this kills failure mode #1:** after 10 projects, a user's switching cost isn't "find another compressor" — it's "rebuild my kit, my presets, my history." Features get copied; accumulated context doesn't.

**Why it kills failure mode #5:** Passport users return without us pushing (their stuff lives here). Retention becomes structural, not promotional.

---

## 6. The Splendid Addition — the Benchmarks Engine 📊

**Honest baseline: today we collect ZERO data.** No cookies, no tracking, no stored creations — and for *people* that principle never changes. But "we have zero data, zero leverage" conflates two different things: we will never hold **user** data, and we can still count **events**. That distinction is the entire unlock.

### The Data Decision (an explicit yes/no — not an assumption)
| | |
|---|---|
| **What we would collect** | Anonymous aggregate counters only: `{"tool":"thumbnail-lab","event":"glance_test","variant_won":"b","niche":"gaming"}` — one Supabase counter table. No user IDs, no IPs, no cookies, no files. |
| **What we NEVER collect** | User identity, files, exports, images, cross-site behavior, anything that identifies a person |
| **Cost** | ≈ $0 — one table, batched counter upserts |
| **Escape hatch** | Instant opt-out; "we count events, never people" published publicly — which is itself a trust/brand asset |

If the answer is **no**: delete this section and Layer 3. The model still stands on ads + Pro + credits — just with one less moat, and §7's tool test drops to two criteria.

### Why it's worth a yes
Thumbnail Lab already runs "3-second glance tests & CTR benchmarking" (`src/data/tools.ts`). Each test is a data point nobody else collects at scale: **how real humans glance at real thumbnails.**

- **Aggregate → publish a monthly "Creator Thumbnail Benchmarks" report.** Best-performing colors, text sizes, face-crop patterns by niche, platform (YouTube feed vs. Shorts shelf).
- The literal answer to "what gets stronger as it grows": **more users → more glance data → better benchmarks → more citations/backlinks/press → more users.** A data network effect from a tool already shipped.
- Nobody can copy it without first having the users — the exact moat the video demands.
- Expansion path: carousel swipe counts, caption readability stats, invoice payment-speed stats ("which payment terms get brand deals paid fastest" — Business Suite users would *opt in* to that one, because it answers a question they desperately have).

---

## 7. What We Will NEVER Build (rules from the autopsy)

1. **No two-sided marketplace** until one category (e.g., bouquet card templates) wins in one niche single-handedly. If ever: 1 category, 1 side first, no subsidies.
2. **No tool whose entire value dies if one platform changes its API** — every platform-dependent tool needs a degradable fallback (Video Grabber's bot-wall was the warning shot; that's why it's "IN DEVELOPMENT," not dead).
3. **No server-side processing where a worker could do it.** On-device-first is both the cost moat and the free-forever promise.
4. **No paywall on any on-device tool. Ever.** We charge for scale, convenience, and identity — never for the core function. (Supersedes the old strategy's "no subscriptions ever" — that rule was failure mode #6 in writing.)
5. **No monetizing all 16 tools at once.** One wedge, prove conversion, expand. (Marketplace-wedge discipline, applied to pricing.)
6. **No user profiling, ever.** Count events, never people. No tracking cookies, no stored creations for anonymous users. Privacy isn't just ethics here — it's our cost structure and our brand.

### Post-mortem: Studio Space Planner (killed 2026-10 — by this exact framework)
- **Failure mode #1:** a house planner is a feature pretending to be a company — Planner5D, Floorplanner, and Sweet Home 3D already exist, free.
- **Failure mode #2 (adjacent):** the audience — people casually sketching house plans — has no urgency and no budget. The people with money (contractors, architects) need construction software, not a browser toy.
- **Affiliate revenue never materialized:** gear links on a low-intent audience ≈ $0. Lesson: affiliate is a bonus, never a pillar.
- **The 3D house builder extension fails the same test:** enormous complexity, weak willingness-to-pay, and it feeds no flywheel — no Passport value, no benchmark data, no repeat-use workflow. Killing it is the disciplined call.
- **Ship rule going forward:** every new tool must feed the **Passport**, the **Benchmarks**, or the **SEO surface** — at least one, or it doesn't ship.

### Post-mortem 2: Roommate Link — the two-sided cold start
- Pure failure mode #3: zero students → zero matches → zero students. A matching product needs both sides on day one; we had neither and no way to push either.
- **Why the invoice share link is NOT that:** single-player value with a viral byproduct. A freelancer creates, prints, and sends an invoice **alone** — full value delivered, second party optional. The client opening the link is a free billboard aimed at our exact future customer (a business that pays freelancers), not a required participant. Same shape as Loom (record alone → share) and Linktree (set up alone → followers click).
- **Rule encoded:** every CreatorKit tool must be fully useful to a party of one. Ours are. Keep them that way — no tool ever requires "other people" to deliver its core value.

---

## 8. Rollout — Validate First, Monetize Second

> **Discipline rule: we have zero users. Nothing paid gets built until the Stage gates below are passed.** A pricing page with no visitors isn't a business model — it's decoration. This is the anti-Space-Planner clause: we spent 5 weeks building what nobody asked for; we will not spend 5 weeks monetizing air.

### Stage 0 — Ship to real people (now → week 6) · cost ≈ $0
**Goal: first 100 humans, not first $100.**
- [ ] Wedge for the launch story: **Invoice/Receipt share links** — our most "wow" flow (send invoice → client opens a beautiful page → downloads PDF/image). Demo it on video; don't describe it.
- [ ] Add a subtle "Made with CreatorKit — free" footer to every shared invoice/receipt page (`receipt-link.ts` pattern) → every invoice a freelancer sends becomes an ad seen by a business. The Loom loop.
- [ ] Launch checklist: Product Hunt, Show HN, r/SideProject, r/SmallBusiness, X/Twitter Ghana + Nigeria creator circles, WhatsApp creator groups, TikTok/Reels/Shorts demo clips (the tools are visual — 15-second screen recordings sell themselves)
- [ ] Analytics only (Plausible/Vercel — already privacy-safe). Ship nothing else.

### Stage 1 — Prove pull, not push (months 1–3)
Watch numbers. Build nothing new unless a gate demands it.

| Gate — ALL must pass before any paid work | Threshold |
|---|---|
| Monthly visits | ≥ 1,000 and growing month-over-month |
| Returning visitors on ≥ 1 tool | ≥ 25% |
| Shared invoices/receipts per week | ≥ 50 |
| Unprompted demand signals | ≥ 3 (emails/DMs/comments asking for batch, hi-res, more templates) |

**If gates fail → fix distribution or tool choice. Never add features.** A failing gate is a marketing problem or a wrong-tool problem — building more is the Space Planner mistake with extra steps.

### Stage 2 — First revenue, zero trust required (after gates · month 3+)
- [ ] AdSense + rewarded-ad quota extension (ads need no user trust; subscriptions do)
- [ ] Brand Kit (local-first) + Output Vault (local) as FREE features — build the return habit before the paywall
- [ ] Only then: Stripe + `/pricing` + credit metering on the 3 server-cost paths (cloud Whisper, video grab, imgly proxy)

### Stage 3 — Pro tier live (only when ALL three are true)
1. ≥ 500 weekly active users
2. ≥ 1 server-cost feature 
in production (something real to meter)
3. ≥ 1 lock-in feature shipped and used by ≥ 20% of actives (Brand Kit)

By then "$7/mo" answers "what exactly am I getting?" with features that exist: 500 AI credits, 4K exports, batch queues, cloud sync. Not before.

### Stage 4 — The Flywheel (months 6+)
- [ ] Benchmarks Engine v1: aggregate glance-test counters → first public report → submit to HN/Reddit/creator press
- [ ] Client Workspace in Studio tier (branded invoice share links)
- [ ] Space Planner sunset: 301 route to home, remove from `tools.ts` + navbar (keeps SEO equity)
- [ ] Evaluate 2nd monetized tool only after captions Pro proves conversion

### KPIs & kill-criteria (post-Stage-3 honesty section)
| Metric | Target | If missed |
|---|---|---|
| Free → Pro conversion | ≥ 2% of monthly actives by month 3 after pricing page | Re-price or re-scope Pro; do NOT add more gates |
| Pro churn | ≤ 6%/mo | Strengthen Passport (retention is lock-in's job) |
| Credit margin | Server cost per credit ≤ 40% of credit price | Raise per-use credit cost, never lower |
| Benchmarks report | ≥ 20 referring domains by report #3 | Kill the report, keep the internal data |

---

## 9. Pricing Page Integration Spec (build ticket — **BLOCKED until Stage 3 gates pass**)

- Route: `src/app/pricing/page.tsx` + `layout.tsx` (SEO: "free creator tools pricing", FAQ schema — reuse `src/lib/seo.ts` helpers)
- 4 cards: Free / Creator Pro (highlighted, "Most popular") / Studio / Credit Pack
- Annual toggle (monthly ⇄ yearly, "2 months free")
- Every paid feature listed must map to a real cost or real lock-in (see §4 table) — no invented value
- CTAs: Free = "Start creating — no account needed"; Pro/Studio = Stripe Checkout; Credits = one-time checkout
- Footer rule: link from Navbar, from end-of-workflow prompts, and from quota-exhausted states — **never** an interstitial inside a tool flow

---

## 10. Hard Truths (the requested anti-optimism section)

- **"What exactly are we offering for $7/month?" — today, nothing.** That's the honest answer, and it's fine. The Pro tier is a specification of what to build once demand exists — unlocked only by the Stage 3 gates. Selling it now would be the Space Planner mistake wearing a Stripe badge.
- **Ads will not pay rent early.** Realistic AdSense RPMs: ~$0.5–2 on African-heavy traffic, ~$2–10 on US/EU. At 10k sessions/month expect **$10–60/month**. Ads are a floor, not a plan. The actual money path is Pro conversion on Business Suite users — freelancers who send invoices are the ones with revenue.
- **Solo + no audience + no ad budget is survivable HERE, specifically** — because costs ≈ $0 (on-device processing, Vercel free tier) and distribution is pull (SEO + share links), not push. We can afford a slow first 6 months; server-cost competitors cannot. Patience is our structural advantage. Use it.
- **The paranoia is data, not destiny.** Roommate Link died on *structure* (two-sided cold start). Space Planner died on *demand* (built in a vacuum). These tools are single-player, search-demanded, and near-zero marginal cost — structurally the opposite of both failures. The remaining risk is execution + patience, and the Stage gates exist to keep both honest.
- **The next 5 weeks belong to showing, not building.** Screen-record the receipt printer. Post the invoice-link demo in every creator WhatsApp group and X circle that will look. A perfected tool nobody has seen yields zero information; a shipped-and-shared one yields information even if the answer is "meh."

---

*This document supersedes the monetization section of `CREATORKIT_STRATEGY.md`. The free experience remains the heart of the product — we're simply finally building the part where the business survives its own success.*
