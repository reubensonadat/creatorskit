# SEO GROWTH PLAYBOOK — CreatorsKit

> The keeper document. Read it, perform it, come back to it.
> Written 2026-10-07. Status when written: **site not yet deployed**.
> Work top to bottom. Each phase unlocks the next. Tick the boxes.

---

## PHASE 0 — DEPLOY (do this first, nothing else works before it)

Search engines only index what is live on a real domain.

- [ ] 0.1 Run `npm run build` — it must finish with all **54 routes** and no errors.
- [ ] 0.2 Confirm `.env.local` has `NEXT_PUBLIC_GA_ID=G-2LZ23QC452` (it does — keep it secret from git, it's already ignored).
- [ ] 0.3 Push to GitHub. Connect the repo to **Cloudflare Pages** (framework: Next.js, build command `npm run build`). First deploy will take a few minutes.
- [ ] 0.4 Buy the domain (`creatorskit.win` or your final choice) — Cloudflare Registrar or Namecheap. `.win` is fine and cheap; `.com` is easier to say out loud if you can get it later.
- [ ] 0.5 In Cloudflare Pages → **Custom domains** → add your domain → follow the DNS instructions. Wait for the SSL padlock (HTTPS) — usually minutes.
- [ ] 0.6 Visit `https://YOURDOMAIN` on your phone and your laptop. Open 3 tools, export one file, answer the cookie banner once. If tools work → Phase 0 done.
- [ ] 0.7 Check `https://YOURDOMAIN/robots.txt` (should list the sitemap) and `https://YOURDOMAIN/sitemap.xml` (should list your pages).

**Done when:** the site is live on HTTPS and you used a tool end-to-end like a stranger would.

---

## PHASE 1 — FIRST 48 HOURS (get Google's attention)

- [ ] 1.1 Go to [search.google.com/search-console](https://search.google.com/search-console) → **Add property** → choose **Domain** → type `yourdomain.com` (no https, no www).
- [ ] 1.2 Google gives you a **TXT record**. Copy it → Cloudflare DNS → add record type TXT, name `@`, paste the value → Save → back in GSC press **Verify**.
- [ ] 1.3 In GSC left menu: **Sitemaps** → enter `sitemap.xml` → Submit. Status should become "Success" within a day.
- [ ] 1.4 **Request indexing by hand** — this jumps the queue (the sitemap only waits in line):
      Top bar search box → paste a URL → press Enter → **Request indexing**.
      Do ~10 per day (Google's daily quota), in this order:
      1. `/` 2. `/match-cut` 3. `/text-highlighter` 4. `/text-behind` 5. `/quote-card`
      6. `/thumbnail-lab` 7. `/auto-captions` 8. `/watermark` 9. `/compressor` 10. `/business`
      Next day: the blog posts, then the rest.
- [ ] 1.5 **Bing Webmaster Tools** ([bing.com/webmasters](https://www.bing.com/webmasters)) → import straight from Google Search Console (one button). Bing powers DuckDuckGo too. Free extra traffic.
- [ ] 1.6 **GA4 smoke test:** your GA property (G-2LZ23QC452) → Reports → Realtime → open your site in another tab, accept the cookie banner → you should appear as 1 active user. If yes: analytics is alive.

**Done when:** GSC shows the sitemap as Success and you've requested indexing for the 10 money pages.

---

## PHASE 2 — WEEKS 1–4 (make the pages WORTH ranking)

Google ranks pages that *answer searches better than anyone else*. Free tools + deep content on the same page = your unfair advantage. Your competitor (textmatchcut.app, ~955K clicks/month) proved it with ONE tool page.

### 2A. Finish the content blocks (biggest lever we control)

Every flagship tool gets long crawlable content UNDER the tool (the `ToolSeoBlock` system — match-cut already has it):

- [ ] match-cut ✅ DONE (this is the template to copy)
- [ ] text-highlighter
- [ ] text-behind
- [ ] quote-card
- [ ] thumbnail-lab
- [ ] auto-captions
- [ ] watermark
- [ ] compressor
- [ ] business (invoice/receipt/contract angle)
- [ ] sync-slate (film-crew keywords: clapper board, timecode, EDL)

Each block = what it is, step-by-step how to use, feature list, FAQ (real questions people type), links to 3 sibling tools. ~2,000 words. Written for a human, not stuffed.

### 2B. One head keyword per tool (one page, one job)

| Tool | Own this search |
|---|---|
| match-cut | text match cut effect free tool |
| text-highlighter | highlight text in video free |
| text-behind | put text behind subject free |
| quote-card | quote card maker free |
| thumbnail-lab | youtube thumbnail a/b test |
| auto-captions | auto captions free no watermark |
| watermark | add watermark to video free |
| compressor | compress video without losing quality |
| business | free invoice generator for creators |
| sync-slate | clapper board app free |

Use the phrase naturally in the page title, the first paragraph, and one FAQ.

### 2C. Blog engine: 1–2 posts per week

- Target **problems**, not news. Formats that work:
  - Comparisons: "CapCut vs browser tools: what's actually free in 2026"
  - Templates: "Invoice template for Ghana freelancers — billing in USD & cedis"
  - How-tos that END at your tool: "How to turn podcast clips into quote cards"
- Every post links to one tool page (never to the homepage).
- 13 posts already exist — new ones go in the same system, sitemap updates itself.

**Done when:** every flagship has its content block + the first 4 new blog posts are live.

---

## PHASE 3 — MONTHS 1–3 (borrow other people's audiences)

Google needs *reasons from other sites* to trust you. Links + mentions:

- [ ] 3.1 **Free-tool directories** (day 1, all free): AlternativeTo, ToolFinder, any "free tools for creators" lists you can find. Submit the site; tag each tool.
- [ ] 3.2 **Product Hunt launch** — launch ONE flagship, not the whole suite. Hook: "Text Match Cut — free, no signup, no watermark, HD export." Midweek morning. One good launch = backlinks + a traffic spike that GSC notices.
- [ ] 3.3 **Reddit & communities — the honest way:** r/VideoEditing, r/NewTubers, r/youtubers, creator Discords, Nigerian/Ghanaian creator WhatsApp groups. ONLY reply when your tool genuinely answers someone's question. One helpful answer > fifty spam links (and spam gets banned, which kills the domain's reputation).
- [ ] 3.4 **YouTube tutorials:** screen-record 2–3 minute "how to make X free" videos per flagship. Upload, put the tool link first in description. These rank in Google's video results and send real users.
- [ ] 3.5 **Share outputs, not links:** post before/after match-cuts, a beautiful quote card, a bouquet. The OG images the site generates make WhatsApp/X shares look premium — that's free impressions.
- [ ] 3.6 **Local advantage:** you have Ghana/Nigeria-specific blog posts. Share them in local creator communities where a "free, works on low data, no signup" pitch is genuinely the strongest selling point on earth.

---

## PHASE 4 — THE WEEKLY RITUAL (15 minutes, every week, forever)

This beats everything else after month 2:

1. GSC → **Performance** → last 28 days.
2. Look at **Queries**. Find searches where you rank **positions 5–15** with real impressions.
3. For each: open the page, add/improve a section (or FAQ) that answers that exact search better. Tighten the title if the search words aren't in it.
4. Request indexing again for pages you changed.
5. Log the week's clicks number in a notebook. Watch the line go up over months, not days.

**Decision rules:**
- Impressions but no clicks → title/H1 problem. Make it match the search.
- Clicks but position >10 → content depth problem. Add an FAQ section.
- No impressions at all for a tool → too new OR keyword too hard. Get it links (Phase 3).

---

## THE DON'T LIST (things that kill sites like ours)

- **Never** buy links or use link farms — one Google penalty ends an ad-revenue business.
- **Never** publish AI-spun filler articles — the site's trust is the product.
- **Never** apply to AdSense before the site is live + indexed (~2 weeks) with real content — early rejections stick.
- **Never** put ads in the tool workspace — the per-tool plan in `src/data/ads.ts` is the law; change it there, nowhere else.
- **Don't** obsess over daily rankings. SEO compounds on a 3–6 month curve.

---

## CHEAT SHEET — where everything lives

| Thing | Where |
|---|---|
| Ad plan per tool (rails/gates) | `src/data/ads.ts` |
| Tool content blocks | `src/components/ToolSeoBlock.tsx` + each tool's `layout.tsx` |
| Per-tool keywords/metadata | `src/lib/seo.ts` system |
| Sitemap/robots | auto: `/sitemap.xml`, `/robots.txt` |
| GA4 + cookie banner | root `src/app/layout.tsx`, `src/components/ConsentGate.tsx` |
| Launch status checklist | `docs/LAUNCH_READINESS.md` |
| Competitor benchmark | bottom of `docs/LAUNCH_READINESS.md` |

**Realistic curve:** months 1–2 = a trickle (hundreds of clicks). Months 3–6 = long-tail compounding IF Phase 2 ships. Month 6+ = flagships contesting real queries. Your competitor got 955K/month on ONE tool — you have 14 shots at that, plus a blog.

---

## APPENDIX — Google account & AdSense signup (owner question 2026-10-07)

**Which account? The same personal Gmail you already use for GA4 + Search Console.** Reasons:

- Google allows only **ONE AdSense account per person, ever** — it cannot be
  merged or moved later. One account can host MANY sites, so this single
  account will serve creatorskit.win and anything else you build.
- GA4, Search Console and AdSense talk to each other best inside one account
  (linking AdSense ↔ GA4 property is a few clicks when they share the owner).
- Payments will be verified against YOU as an individual (name on the account
  = name on the bank ID). Ghana is supported — AdSense pays by wire transfer
  (EFT) to Ghanaian bank accounts in USD.
- Only consider a separate account if you register a formal company AND want
  payments in the company's name — you'd then create the AdSense account as
  "Business" from the start. For a solo creator, personal/individual is right.

**Signup steps (after ~2 weeks live + indexed):**
1. adsense.google.com → sign in with that same Gmail → **Get started**.
2. Enter the site URL (`https://yourdomain`) → it must be LIVE and owned by
   you (GSC verification already proves this).
3. Fill payee name/address EXACTLY as they appear on your bank/ID documents.
4. Google reviews (days → ~2 weeks). The site should have its content blocks
   and blog posts visible — approval is about CONTENT and policy, not traffic.
5. When approved → AdSense → Sites → connect — the ad slots the codebase
   already reserves (rails, anchor, gate) are where units get placed.
6. Reach the $100 threshold → verify identity + address PIN → payments monthly.

### Where the banners come from (how AdSense serving works)

You do NOT design or download banners. AdSense is a live auction:

1. You paste a small **ad unit code snippet** (`<ins class="adsbygoogle" …>` + one
   script) into a page slot. That's it — the snippet is an empty box.
2. Every visitor loads that box; Google runs a real-time auction among
   advertisers targeting that visitor (context, location, device) and fills
   the box with the winning banner automatically. Different people see
   different ads.
3. You earn per click (mostly) and per thousand impressions (sometimes).

### CRITICAL after approval — enable "Limited ads" (Deny ≠ $0)

The consent model shipped in the codebase (`src/app/layout.tsx`) is
**region-scoped**: worldwide defaults are GRANTED; EEA+UK visitors get
denied-until-choice defaults stacked via the `region` parameter. That is
what stops "deny" from meaning zero revenue — but it ONLY pays if you flip
one switch in AdSense after approval:

**AdSense → Privacy & messaging → "Limited ads" → ON.**

With it ON, a visitor who denies consent still sees non-personalized ads
served WITHOUT cookies (Google calls these "limited ads") — a Deny costs
personalization revenue, not ALL revenue. Without it, denied visitors in
regulated regions can end up seeing no ads at all. Do this the same day
the account is approved. Never turn it off.

### Two ways to fill our reserved slots — USE BOTH

**STATUS 2026-10-08 — the AdSense script is INSTALLED:**
Google's loader (`?client=ca-pub-7897650446063664`) now sits in the
`<head>` of `src/app/layout.tsx`, AFTER the Consent Mode default script
(order matters — consent defaults only bind Google tags that load after
them). `public/ads.txt` authorizes the account. Review can proceed once
the site is deployed on creatorskit.win.

**Are our mock placements still needed? YES — more than ever.**
Google's script is just the ENGINE. It serves ads two ways:

- **Auto ads** = "Google decides where". Zero code, zero control — Google
  can inject ads into spots we'd never allow (that's how tool layouts get
  ruined by sites that use it blindly).
- **Manual units** = "we decide where". Our placeholders (right rail
  `AdRailSlot`, mobile anchor, homepage leaderboard) are PRE-BUILT manual
  slots: when approved, each dashed box swaps for a real `<ins>` unit and
  a real ad appears EXACTLY there — never inside a workflow, never on
  bouquet/gift pages (those have no slots at all).

So the placements are not replaced by the script — they are the reason we
keep control of it. Plan: manual units fill our slots (precision), Auto
in-page fills content gaps (fallback).

**A. Auto ads — format ruling (owner question 2026-10-08):**
The AdSense setup screen offers these formats. Ruling:

- **In-page ("ads over page content without affecting layout")**: **ON** —
  fills content gaps; the only auto format we allow.
  - Sub-format **Banner ads** (within main content): **ON** — earns on the
    blog + homepage sections; Google's placer favors text-rich pages, so
    tool canvases are naturally avoided. If one ever lands badly inside a
    tool page after launch, flip this sub-format OFF in AdSense (remote,
    no code) — that is the one-week review check.
  - Sub-format **Multiplex** (ad grid at page bottom, if offered): **ON** —
    appended at the bottom, cannot interrupt any workflow.
- **Anchor ads**: **OFF** — WE already own the bottom slot (our 320×50
  `.ck-anchor-ad`); Google's anchor would double-stack on mobile.
- **Side rail ads**: **OFF** — WE already own the right side (our 300×600
  `AdRailSlot`); Google's rail would duplicate it.
- **Vignette ads**: **OFF** — full-screen interruptions are banned on this
  site (owner ruling; the adblock wall was already downgraded to a toast).

**B. Manual display units (precision, add in week 2+):**
Ads → By ad unit → Display ads → create:
- one **300×600** unit → its `<ins>` snippet replaces the `AdRailSlot`
  placeholder in `src/components/ToolLayout.tsx` (id `ck-rail-right-300x600`)
- one **320×50** unit → the mobile anchor placeholder
  (id `ck-anchor-mobile-320x50`, class `.ck-anchor-ad`)
- one **responsive/728×90** unit → the homepage leaderboard + /redirect page

The placeholders were built for exactly this swap: the dashed "AdSense-ready"
boxes become real units, still wrapped in our region-scoped Consent Mode
rules (worldwide: ads serve by default; EEA+UK: nothing stored until the
visitor chooses, and a Deny falls back to cookieless limited ads — see the
Limited ads step above).

**What NOT to do:** no units inside tool workflows, nothing beyond the plan
in `src/data/ads.ts`, nothing on bouquet/gift pages. More ads ≠ more money —
RPM collapses when users bounce.
