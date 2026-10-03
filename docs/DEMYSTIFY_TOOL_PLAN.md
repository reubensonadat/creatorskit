# DEMYSTIFY v2 — The front door that answers back

> **Status:** ⛔ **FROZEN SPEC — no tickets start** (owner ruling, 2026-10-03 later same day; see FREEZE below).
> **v1:** LIVE at `/demystify` (BYOK planner, 50/50 build verified 2026-10-03) — **stays live as-is** at $0 running cost.
> **Trigger (owner ruling, 2026-10-03):** "we give, using Cloudflare Workers AI, like 5 prompts a day" + "the plan of the demystifier should be much better, it should do more than ChatGPT."
> **Governing monetization doc:** `docs/BUSINESS_MODEL_PLAN.md` — Demystify v2 is that plan's **first metered cloud-AI feature** (§4 Layer-2 free allowance pattern, §8 stage gates).

## ⛔ FREEZE RULING (2026-10-03, later same day)

**v2 stays a spec. No §5 ticket starts.** Owner's doubt, upheld against the owner's own framework: zero users to validate against; "it is not even more useful than ChatGPT right now — ChatGPT gives you agents that DO the work"; "we are thinking of how to use AI to build AI." That is the anti-Space-Planner clause (`BUSINESS_MODEL_PLAN.md` §8: *"we will not spend 5 weeks monetizing air"*) firing correctly. **The next session executes the Stage-0 launch checklist** (`BUSINESS_MODEL_PLAN.md` §8): invoice share-link demo video, WhatsApp creator groups, Product Hunt / Show HN, 15-second tool clips. Show, don't build.

### Reactivation criteria (any one unfreezes §5)
- Stage-1 pull signals on the live v1: ≥1,000 visits/mo site-wide and ≥25% returning on `/demystify`, or ≥3 unprompted asks for plan/quota features (the §8 gates, applied to this tool).
- The seed library (§3.3) may ship standalone ($0 infra, static data) IF launch surfaces plan-intent traffic — owner call at that point.

### Recorded for the unfreeze — engine research (2026-10-03)
- **Local-model option investigated, parked:** a ~50MB Hugging Face model cannot follow the plan schema (SmolLM2-135M class = toy; smaller models hallucinate *more*, not less). First viable local tier ≈500MB–1GB (Qwen3-0.6B / Gemma-3-1B / Llama-3.2-1B) via WebLLM + WebGPU — desktop-class only, a DATA-SAVER conflict with our market, and still below the CF 70B default on quality. If v2 ever builds, LOCAL MODE is an opt-in unlimited tier (§2 candidate), never the engine.
- **POS-for-Ghanaian-shops pivot idea: autopsied, not pursued.** Free incumbent (Loyverse — offline, inventory, receipts), zero demand evidence ("I don't even know the demand"), and it feeds no CreatorKit flywheel (§7 ship rule: Passport / Benchmarks / SEO surface — a POS feeds none). If ever revisited: 10 real shop-owner conversations before one line of code.

---

## 0. TL;DR

**v1's front door is locked.** Before any value, a new visitor must obtain and paste a third-party API key — at a suite whose promise is "no account needed." v2 unlocks the door:

1. **Zero-setup AI.** Our Cloudflare Workers AI key serves the first plan. No key, no login, no chat log — type an idea, get a plan.
2. **5 free AI actions/day** per device (owner's number). Quota is enforced statelessly with an HMAC-signed envelope — zero server storage, zero user data, "count events, never people."
3. **BYOK stays as UNLIMITED MODE** — groq/openai/gemini keyring unchanged. Their key = their cost = no quota. Our cost moat, their escape hatch.
4. **More than ChatGPT** (§3): executable steps with tool hand-offs, one-shot plan TRANSFORMS (not chat), a deterministic seed-plan library (instant, $0 AI), artifacts (checklist print, teleprompter rehearsal, quote-card poster), MY PLANS vault, and the mind map that is already ours.
5. **Stage-gated monetization:** no pricing anywhere in v2. Rewarded-ad quota extension waits for Stage 2 (AdSense); Pro quota waits for Stage 3 (credits) — same gates as `BUSINESS_MODEL_PLAN.md` §8.

**Positioning line: *ChatGPT gives you a list. Demystify hands you the tools.***

---

## 1. What changed, v1 → v2

| | v1 (live) | v2 (this spec) |
|---|---|---|
| First AI use | BYOK — paste a key first | **Instant.** Our CF Workers AI key, zero setup |
| Cost bearer | User (their key) or nothing | Us, **metered**: 5 AI actions/day/device, hard neuron ceiling (§6) |
| Provider set | groq / openai / gemini | **cloudflare (default)** + the three as UNLIMITED MODE |
| Interaction model | One plan per idea, regenerate replaces | Same ruling kept — plus **one-shot transforms**: DEEPEN / REGROUP / RESCOPE (§3.2). Still no chat |
| Instant value | Wait for model round-trip | **Seed plan library** — deterministic plans, no AI call, offline-capable (§3.3) |
| Output | Steps + tool chips + mind map + markdown | + printable checklist, teleprompter hand-off, quote-card hand-off, MY PLANS multi-plan vault (§3.5) |
| Quota plumbing | None | HMAC-signed envelope (§4) — stateless, edge-safe, $0 infra |
| Server data | Zero | Still zero (§4.4) — envelope lives in the user's localStorage |

---

## 2. The AI engine — Cloudflare Workers AI on our key

### 2.1 Provider & routing

- **Default provider: `cloudflare`.** One AI action = one chat-completion round trip via the Workers AI REST run endpoint (host-agnostic — works on Cloudflare Pages, Vercel, local dev; no Pages binding required):
  `POST https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/{model}`
  with `Authorization: Bearer CLOUDFLARE_API_TOKEN` (token scope: Workers AI only).
- **Env:** `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `DEMYSTIFY_QUOTA_SECRET` (§4).
- **Models (ruling #3 "never hard-code" extends here):**
  - Default: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` — quality tier.
  - Auto-fallback: `@cf/meta/llama-3.1-8b-instruct-fast` — cheap/fast tier; also the *cost-ladder* step when neuron burn approaches the ceiling (§6).
  - Optional A/B: `@cf/openai/gpt-oss-120b` (quality experiment, watch neurons).
  - Live list via `GET …/ai/models/search` (task = Text Generation) — feeds the same FETCH MODELS UI the BYOK providers use. Quarterly model review stays a standing rule (Gemini's 2.5 retirements were the warning).
- **JSON discipline:** prompt-enforced raw JSON (v1 system prompt carries over) + `normalizeDemystifyPlan` defense + **one** silent retry (cheaper model) on malformed JSON. Retries never consume a quota unit.
- **Auto-model-cycle (ruling #4)** applies to cloudflare too: pick → fallback → modelList, ≤3 tries, green note on switch.
- **Edge runtime:** route must declare `runtime = 'edge'` for the Pages deploy (parity with `/r/[id]`). HMAC via Web Crypto `crypto.subtle` — available on edge and Node 18+.

### 2.2 Error translation (ruling #1 — unchanged, extended)

`friendlyProviderError()` gains the Cloudflare shapes; every failure still returns one actionable sentence:

| CF signal | User-facing copy (shape) |
|---|---|
| `errors[0]` mentions invalid/missing credentials, 401 | "Our free AI hit a config problem — switch to UNLIMITED MODE with your own key below, or retry in a moment." |
| 429 / rate limit | "Free AI is busy right now. Wait a moment, or use your own key in UNLIMITED MODE." |
| 400 model not found / retired | Same FETCH-MODELS guidance as v1, CF branch |
| Neurons exhausted / capacity | "Today's free AI budget is stretched — retry later or bring your own key (it's free from Groq)." |

Raw JSON → server console only. **Fail-closed rule:** if `DEMYSTIFY_QUOTA_SECRET` or the CF env vars are missing, the cloudflare provider refuses to run (clear BYOK notice) rather than serving unmetered requests.

---

## 3. "More than ChatGPT" — the feature stack

The honest question: *ChatGPT also writes plans, for free, unlimited.* Why does Demystify exist? Because of everything around the plan that a chat product structurally cannot copy (see `BUSINESS_MODEL_PLAN.md` §3 — the workflow is the product):

### 3.1 Zero-setup + zero-account (front door)
Type an idea → plan. No key (v2), no login, no conversation history, no cookies. ChatGPT's free tier is a login + app-switch away from the tools that execute the plan. Ours is the same tab.

### 3.2 Plan TRANSFORMS — the anti-chat (ruling #2 preserved)
Still no conversation. Each transform is a **one-shot structured rewrite** costing exactly 1 AI action from the same 5/day:

| Transform | What it does | Why ChatGPT can't (cheaply) |
|---|---|---|
| **DEEPEN ▸** on any step | Drill one step into its own sub-plan (5–7 micro-steps), grafted into the mind map as a deeper branch | Consumes the checked-state + tool graph context, output lands *inside* the artifact |
| **REGROUP ▸** | Re-plans only the UNCHECKED steps — acknowledges progress, shrinks the remaining work (anti-procrastination spine) | Requires the persisted checklist state we already own |
| **RESCOPE ▸** | Constraint chips: `PHONE ONLY` · `NO BUDGET` · `1 HOUR/DAY` · `SOLO` → model rewrites the plan under the constraint | One tap, not a re-prompt; constraints are UI, not typing |

This formalizes v1's deferred idea ("agent-generated sub-branches per node") as the DEEPEN action.

### 3.3 Seed plan library — instant, deterministic, $0 (SEO surface)
`src/data/demystify-seeds.ts` (NEW): ~10 hand-tuned plans for the highest-intent creator searches. Each seed renders **instantly with no AI call** (offline-capable, quota-free) and carries a **PERSONALIZE WITH AI** button (1 AI action → full plan seeded from the template — better output, fewer tokens).

Launch set (owner to prune): start a YouTube channel · first podcast episode · launch TikTok from zero · plan a week of carousels · invoice your first brand deal · shoot a talking-head video with a phone · build a creator brand kit · repurpose one long video into ten clips · plan a paid collaboration pitch · start a faceless channel.

**Why it matters:** every seed = an SEO landing intent ("how to start a podcast free plan") → passes the §7 ship rule (feeds SEO surface); instant value before the first AI wait; free quota lasts longer; and the seeds teach the model's allowlist vocabulary by example (seeds can be injected as a schema exemplar).

### 3.4 Executable steps (v1 spine — kept, extended)
18-slug validated tool chips with text hand-offs (`putHandoffText` for match-cut/text-highlighter) stay the moat's edge. v2 adds two artifact hand-offs:

- **TELEPROMPTER ▸ "Rehearse this plan"** — plan text stashed as a script (read-your-plan-aloud, the anti-procrastination ritual).
- **QUOTE CARD ▸ "Poster this step"** — any step's title/detail becomes a printable poster (motivation artifact; feeds the quote-card deck).

### 3.5 MY PLANS — the Output Vault surfaces here (Passport seed)
Multi-plan store in local-memory (`states` store, `demystify:plans`): list / switch / delete, checked-state per plan, restored on return; visible in `/your-data`. Zero server storage — the `BUSINESS_MODEL_PLAN.md` §5 storage principle in miniature: Pro cloud sync later, local forever now.

### 3.6 Artifacts (beyond markdown)
Markdown export (v1) + **PRINT CHECKLIST** via the existing `client-document-printer` brutalist template (fridge-sheet energy) + the mind map (ruling #6 unchanged — ours, templated, infinite drill-down; DEEPEN grows it).

### 3.7 Quota UX
A persistent chip: `FREE AI · 3 OF 5 TODAY · resets 00:00`. At zero: seeds still instant, transforms/DEEPEN locked, and the panel presents (in order) **UNLIMITED MODE (bring a key — Groq is free)** → rewarded-ad note when Stage 2 ships. Never an interstitial inside the flow (pricing-page footer rule, `BUSINESS_MODEL_PLAN.md` §9).

---

## 4. The quota system — 5/day, stateless, private

Owner's number: **5 AI actions per day** on our key (plan, regenerate, or any transform — each costs 1).

### 4.1 Envelope design (no DB, no KV, no account)
- Client generates a random **`deviceId` UUID** once (localStorage; not derived from any PII — it counts a *device slot*, never a person).
- Every cloudflare-provider response returns `{v:1, d, day:"YYYY-MM-DD", n:<used>, max:5}` + `sig = HMAC-SHA256(DEMYSTIFY_QUOTA_SECRET, canonical)`.
- Next request presents the envelope; the route **verifies the signature**, takes the server clock's date as truth (stale/absent envelope ⇒ `n=0` fresh day), and rejects with 429 + friendly copy when `n ≥ max`.
- Increment happens **server-side** in the signed re-issue — the client can read its counter but cannot forge one.
- Day rollover invalidates old envelopes automatically (date is inside the signed payload) — daily reset for free.

Why not KV/Supabase/DO: v1 of the quota needs to cost $0 and store nothing (`BUSINESS_MODEL_PLAN.md` §6 Data Decision pending). When traffic is real (Stage 2+), the same envelope upgrades to a KV-backed counter for hard multi-device limits — one function swap, no schema.

### 4.2 Rewarded-ad extension (+1/use) — **spec'd, Stage-2 BLOCKED**
The `BUSINESS_MODEL_PLAN.md` Layer-1 pattern ("exhausted quota → watch an ad → +1 use") is the designed hook: envelope gains a signed `bonus` field, incremented server-side on ad-completion callback. **Not built now** — no rewarded ad unit exists until AdSense lands (§8 Stage 2). Design constraint to respect later: bonus must be verifiable (ad-network callback), never a client-side claim.

### 4.3 BYOK = UNLIMITED MODE
groq/openai/gemini requests skip the envelope entirely (their key, their cost, $0 to us). The keyring stays shared with auto-captions. UI copy: "UNLIMITED MODE — your key, your speed."

### 4.4 Privacy audit (the §6 promise, kept)
| Stored server-side | Stored client-side | Never stored |
|---|---|---|
| Nothing. Ideas transit the route and are discarded; only `console.error` fragments on failure. | deviceId UUID, quota envelope, plans, checked steps, keys (BYOK) | IPs, names, accounts, plan contents on any server |

### 4.5 Pro tier (spec only — BLOCKED until Stage 3)
When credits ship (`BUSINESS_MODEL_PLAN.md` §4 Layer 2 / §9): signed-in Pro = envelope `max` raised against the credit meter (e.g. 50/day then credit-debited). Nothing in v2's UI may reference this yet.

---

## 5. Architecture — files & tickets (build order) — ⛔ FROZEN, see header

| # | Ticket | File(s) | Notes |
|---|---|---|---|
| T1 | CF provider in the route | `src/app/api/demystify/route.ts` | cloudflare branch + env guards (fail-closed) + `runtime='edge'` + CF error shapes in `friendlyProviderError` |
| T2 | Quota envelope | `src/app/api/demystify/route.ts` + **NEW** `src/lib/demystify-quota.ts` | server: HMAC sign/verify + increment; client: deviceId, envelope custody, `used/max` state for the chip |
| T3 | Lib registry update | `src/lib/demystify.ts` | `cloudflare` provider entry (no keyUrl — "OUR TREAT: 5 FREE A DAY"), RECOMMENDED_MODELS + model-list via `/ai/models/search`, transform request types |
| T4 | Transforms in the route | `src/app/api/demystify/route.ts` | `action: 'plan' \| 'deepen' \| 'regroup' \| 'rescope'`; deepen/regroup/rescope prompts consume envelope; 1 free retry on malformed JSON |
| T5 | Seeds | **NEW** `src/data/demystify-seeds.ts` + `page.tsx` gallery | deterministic plans, PERSONALIZE WITH AI, schema-exemplar reuse |
| T6 | Page UX | `src/app/demystify/page.tsx` | default cloudflare, quota chip, transform buttons, MY PLANS drawer, new hand-offs (teleprompter, quote-card), BYOK→UNLIMITED MODE relabel |
| T7 | SEO | `src/app/demystify/layout.tsx` | add "free AI project planner no login", "chatgpt alternative for planning", "AI task breakdown free" intents; keep anti-procrastination set |
| T8 | Progress log | `docs/INTEGRATION_PROGRESS.md` | session record |

T1–T3 ship the unlock (zero-setup + quota). T4–T5 ship the "more." T6–T7 the surface. Each ticket ends `tsc` clean + build green, per house rule.

---

## 6. Cost model & guardrails (failure-mode #4 defense)

- **Unit cost:** one plan ≈ 700 tokens in / ~900 out → roughly 1–3k neurons on llama-3.3-70b-fp8-fast, ~an order less on 8b-fast. **Verify live in the CF dashboard after day 1** — these are estimates, not invoices.
- **Free allocation:** Workers AI includes ~10k neurons/day free → covers only a handful of 70B plans/day. Mitigation ladder, in order:
  1. Traffic is tiny (Stage 0–1) → 70B default is fine.
  2. Burn > ~60% of daily free → flip default to 8b-fast (config, not code).
  3. Real pull (§8 gates pass) → Workers AI paid (≈$5/mo floor; ~$0.011/1k neurons beyond free — verify) → even ~1k plans/day stays in single-digit dollars.
  4. Runaway (never expected at these caps) → tighten free count to 3/day + UNLIMITED MODE push.
- **Hard caps regardless of tier:** idea ≤ 4,000 chars (exists) · `max_tokens` ≤ 1,600 · temperature 0.4 · one retry · 5/day/device · no anonymous batch, ever.
- **Worst-case math:** 100 devices × 5 actions × 3k neurons = 1.5M neurons/day ≈ low single-digit $/day on paid tier — and that scenario *requires* 100 daily-active planners, which is a Stage-3 problem wearing a party hat.

---

## 7. KPIs & kill-criteria (extend `BUSINESS_MODEL_PLAN.md` §8 table)

| Metric | Target | If missed |
|---|---|---|
| Demystify → tool hand-off click-through | ≥ 25% of planners click ≥ 1 chip within a session, by month 2 | The "more than ChatGPT" thesis is wrong → demote to pure planner + seeds, keep SEO |
| Quota-wall friction | ≤ 30% of daily users hit 0-remaining | Raise to 7/day or flip to 8b (cost ladder §6) |
| Seed coverage | ≥ 30% of first plans start from a seed | Prune/replace the seed set monthly from real queries |
| Neuron burn | ≤ 60% of daily free allocation | Cost ladder §6 |
| BYOK attach | ≥ 5% of repeat planners bring a key | Improve the key walkthrough, don't force it |
| Benchmarks counter (`demystify_plan_generated`) | **OFF until the §6 Data Decision is YES** | n/a — not an assumption |

---

## 8. Owner rulings ledger (v1 — all still binding)

1. **Filtered errors only** — never raw provider JSON (§2.2 extends to CF).
2. **One-shot plans, no chat** — transforms are one-shot rewrites, not conversation; the ruling's spirit (value = steps + hand-offs, not chat) is preserved.
3. **Never hard-code the model** — extends to the CF defaults; quarterly model review.
4. **Zero-work model handling** — auto-fetch/auto-cycle includes cloudflare.
5. **ThinkingOrb journey** — unchanged; one orb stage per transform type.
6. **Mind maps are OURS** — deterministic template, infinite drill-down; DEEPEN grows it deeper.
7. **Memory** — full state via local-memory; MY PLANS extends, doesn't replace.
8. **Mobile gutters** — `tool-inner-container` on every new panel/drawer.
9. **Anti-procrastination SEO** — seed intents join the keyword set.
10. **Teach the key** — walkthroughs stay for UNLIMITED MODE; the default path needs no key at all now.

**v2 rulings (2026-10-03):**
- **V1.** Free tier = **5 AI actions/day** on our Cloudflare Workers AI key (the owner's number).
- **V2.** Default provider = cloudflare; BYOK relabeled UNLIMITED MODE, unlimited and unmetered.
- **V3.** No pricing, no Pro mention, no rewarded-ad promise in UI until the business-plan stage gates open (§4.2, §4.5).
- **V4.** Quota must cost $0 infra and store nothing server-side (envelope design) — the Data Decision stays pending, not presumed.

---

## 9. What we will NOT build (v2 guardrails)

- **No chat UI. Ever.** Regenerate/transforms only — "why would I come here, I'll just go to Gemini" is answered by doing what Gemini can't: hand-offs, seeds, artifacts, state.
- **No server-side plan storage** for anonymous users — plans live on-device (local-memory → `/your-data`).
- **No unmetered use of our key** — fail-closed env guards; envelope or nothing.
- **No quota pain-walls** — hitting 0 always leaves seeds + checklist + markdown + BYOK exit; never a dead end, never an interstitial.
- **No Pro-gating of anything that exists today** — v2 only adds free-tier surface; paid surfaces wait for Stage 3 (`BUSINESS_MODEL_PLAN.md` §9 discipline).

---

## 10. Verification record

- **v1 (2026-10-03, live):** `npx tsc --noEmit` clean on touched files; `npm run build` GREEN 50/50 routes incl. `/demystify` + `/api/demystify`; ThinkingOrb + mind-map verified live; friendly errors live-confirmed (Gemini 503, retired-model 404).
- **v2:** not started — see §5 build order. First ticket lands with the same verification bar + a live neuron-burn reading after day 1 (§6).

---

## 11. Open questions (owner) — dormant while frozen

1. Seed list sign-off (§3.3 launch set of 10 — prune/reorder?).
2. Free count confirmation: 5/day is spec'd as ruled; comfortable codifying 5 + rewarded extension at Stage 2?
3. Benchmarks counter for plans — include in the eventual Data Decision batch, or leave Demystify permanently uncounted?
