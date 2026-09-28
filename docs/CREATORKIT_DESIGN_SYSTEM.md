# The CreatorKit Neo-Brutalist Design System (Portable Edition)

> **Purpose:** This is the complete design language of CreatorKit.win, extracted and decoupled from the app so you can transplant it into **any other project** — web, mobile, or print-adjacent. Copy the tokens, paste the recipes, keep the rules. Nothing here depends on the CreatorKit codebase.
>
> Grounded in the live implementation: [`src/app/globals.css`](../src/app/globals.css), [`src/components/ToolLayout.tsx`](../src/components/ToolLayout.tsx), [`src/app/layout.tsx`](../src/app/layout.tsx).

---

## 1. Core Philosophy

Neo-brutalism for tools that must feel **physical, honest, and fast**:

1. **Borders over blur.** Every surface is declared with a hard 2px black border. No soft ambiguous edges, no guesswork about what's clickable.
2. **Shadows that obey gravity.** Offsets are hard, never blurred — elements look like they sit *on* the page and can be *pressed into* it.
3. **Interaction is physical.** Hover lifts (shadow grows), press sinks (element translates toward its shadow). 80 ms, snappy, no easing drama.
4. **Monospace is the voice of the machine.** UI chrome (buttons, badges, labels) speaks in uppercase monospace; content speaks in a humanist sans.
5. **One loud color.** A single electric yellow is the only saturated color in the chrome. Everything else is black, white, and gray — so the yellow always means "this matters."
6. **Dark mode is a per-tool decision, not a toggle.** Studio tools stay light and paper-like; immersive tools may go dark.

---

## 2. Design Tokens

### 2.1 The portable CSS variable block (copy-paste this)

```css
:root {
  /* Surfaces */
  --bg:        #ffffff;  /* page background           */
  --bg-2:      #f4f4f5;  /* app workspace / canvas    */
  --surface:   #ffffff;  /* cards, panels, topbars    */
  --surface-2: #f9f9f9;  /* nested wells, hover bg    */

  /* Neutrals (the "oat" scale) */
  --oat:       #e5e5e5;  /* default line color        */
  --oat-dark:  #d4d4d4;  /* pressed lines             */
  --oat-light: #f0f0f0;  /* soft dividers             */

  /* Ink */
  --charcoal:   #000000; /* primary ink / borders     */
  --charcoal-2: #333333; /* secondary text            */
  --charcoal-3: #888888; /* hints, captions           */

  /* Lines */
  --line:      #e5e5e5;
  --line-soft: #f0f0f0;

  /* The One Loud Color */
  --ck-yellow:       #FFE500; /* signature — CTAs, brand chip  */
  --ck-yellow-hover: #fde047;

  /* Hard ink (dark button variant) */
  --ink:        #09090b;
  --ink-hover:  #18181b;

  /* Status (used sparingly, never for chrome) */
  --success: #22c55e;
  --warn:    #eab308;
  --danger:  #ef4444;
}
```

### 2.2 Color usage rules

| Role | Token | Allowed on |
|---|---|---|
| Page | `--bg` / `--bg-2` | Body, workspace canvas |
| Surface | `--surface` | Cards, topbars, panels, buttons (default) |
| Ink | `--charcoal` | Text, borders, shadows — always pure `#000` |
| Accent | `--ck-yellow` | **Only** primary CTAs, brand chips, focus moments |
| Status | `--success/warn/danger` | Feedback only — never decoration |

**The 90/10 rule:** ≥90% of any screen is black/white/gray. Yellow occupies ≤10% — if everything is loud, nothing is.

### 2.3 Borders, shadows & radii (the signature trio)

| Element | Border | Shadow (hard offset) | Radius |
|---|---|---|---|
| Button (default) | `2px solid #000` | `3px 3px 0 #000` | `4px` |
| Button (compact chrome, e.g. topbar) | `2px solid #000` | `2px 2px 0 #000` | `0` |
| Card | `2px solid #000` | `4px 4px 0 #000` | `6px` |
| Badge | `1.5px solid #000` | none | `4px` |
| Panel / topbar edge | `2px solid #000` (bottom or right only) | none | `0` |
| Dense studio control | `2px solid var(--line)` → `var(--charcoal)` on hover | none | `0` |

Never blur these shadows. Never use `outline` glow. Focus = 2px black ring or the yellow fill.

### 2.4 Spacing & sizing scale

```
4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px     (general layout)
2px   borders (always — it's the system's fingerprint)
52px  topbar height
240px · 280px  side panels in the 3-pane workspace
```

### 2.5 Typography

| Voice | Family | Weight | Case & tracking | Used for |
|---|---|---|---|---|
| **Machine** | `monospace` (system) | 700–900 | `UPPERCASE`, letter-spacing `0.02–0.1em` | Buttons, badges, hints, labels, chips |
| **Human** | `Inter` / Geist Sans | 400–700 | sentence case | Body copy, descriptions |
| **Title** | Inter / Geist Sans | 900 | tight tracking `-0.02em → -0.03em` | Tool names, page H1s |

Reference sizes (from the live topbar/chrome):

| Role | Size | Notes |
|---|---|---|
| Page title | `0.95rem`, w900 | tracking `-0.03em` |
| Button label | `0.72–0.76rem`, w900 | uppercase mono |
| Kicker / hint | `0.6rem`, w700 mono | uppercase, `0.1em` tracking, `--charcoal-3` |
| Badge | `0.68rem`, w900 mono | — |

For creative canvases (quote cards, match cuts), a separate async-loaded display-font catalog is allowed — display fonts are *content*, never chrome.

### 2.6 Motion

| State | Transform | Shadow | Duration |
|---|---|---|---|
| Rest | none | `3px 3px 0 #000` | — |
| Hover | `translate(-1px, -1px)` | `4px 4px 0 #000` | 80 ms ease |
| Active (pressed) | `translate(2px, 2px)` | `1px 1px 0 #000` | 80 ms ease |
| Disabled | none, `opacity: 0.5` | `2px 2px 0 #000` | — |

Everything else (panels, cards): `transition: all 0.15s`. Nothing in the chrome animates slower than 200 ms.

---

## 3. Component Recipes (framework-free CSS)

### 3.1 Buttons

```css
.brutalist-button {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 8px 16px;
  background: #ffffff; color: #000000;
  border: 2px solid #000000; border-radius: 4px;
  font-family: monospace, system-ui, sans-serif;
  font-size: 0.76rem; font-weight: 900;
  text-transform: uppercase; letter-spacing: 0.02em;
  cursor: pointer; user-select: none; text-decoration: none; line-height: 1.2;
  box-shadow: 3px 3px 0 #000000;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background 0.12s ease;
}
.brutalist-button:hover  { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #000; background: #fcfcfc; }
.brutalist-button:active { transform: translate(2px,2px);   box-shadow: 1px 1px 0 #000; }
.brutalist-button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: 2px 2px 0 #000; }

/* Primary — the yellow one. One per screen, ideally. */
.brutalist-button-primary { background: #FFE500; color: #000; }
.brutalist-button-primary:hover { background: #fde047; }

/* Dark — inverse ink for secondary emphasis */
.brutalist-button-dark { background: #09090b; color: #ffffff; }
.brutalist-button-dark:hover { background: #18181b; }
```

### 3.2 Cards & badges

```css
.brutalist-card {
  background: #ffffff;
  border: 2px solid #000000;
  border-radius: 6px;
  box-shadow: 4px 4px 0 #000000;
}

.brutalist-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px;
  background: #ffffff; color: #000000;
  border: 1.5px solid #000000; border-radius: 4px;
  font-family: monospace; font-size: 0.68rem; font-weight: 900;
}
```

Badge text is always ALL-CAPS keywords: `NEW`, `POPULAR`, `EXTERNAL`, `DATA SAVER`.

### 3.3 Dense studio controls (for tool UIs, not landing pages)

```css
.btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px;
  border: 2px solid var(--charcoal);
  background: var(--surface); color: var(--charcoal);
  font-family: Inter, system-ui, sans-serif;
  font-size: 11px; font-weight: 700;
  border-radius: 0; cursor: pointer; line-height: 1.2;
  transition: all 0.15s;
}
.btn:hover, .btn.active { background: var(--charcoal); color: var(--surface); }
.btn-primary { background: var(--charcoal); color: var(--surface); }
.btn-icon { width: 30px; height: 30px; padding: 0; justify-content: center; font-size: 12px; }
```

`border-radius: 0` — inside the workspace, controls are sharp, small (11 px), and invert on hover instead of casting shadows.

### 3.4 Selectable list items

```css
.item-card {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 8px;
  border: 2px solid var(--line); border-radius: 0;
  background: var(--surface); cursor: pointer; transition: all 0.15s;
}
.item-card:hover  { border-color: var(--charcoal); background: var(--surface-2); }
.item-card.active { border-color: var(--charcoal); background: var(--charcoal); color: var(--surface); }
```

Selection = full ink inversion. Selected states are never subtle.

---

## 4. Layout Patterns

### 4.1 Tool shell (the 3-pane workspace)

```
┌──────────────────────────────────────────────┐
│ TOPBAR  52px · white · 2px black bottom edge │
├───────────┬──────────────────────┬───────────┤
│ LEFT      │  CANVAS              │ RIGHT     │
│ 240px     │  1fr                 │ 280px     │
│ panel     │  bg: --bg-2          │ panel     │
└───────────┴──────────────────────┴───────────┘
```

```css
.app {
  display: grid;
  grid-template-rows: 52px 1fr;
  height: 100vh; height: 100dvh;
  overflow: hidden;
}
.workspace {
  display: grid;
  grid-template-columns: 240px 1fr 280px;
  overflow: hidden;
}
.panel { background: var(--surface); border-right: 1px solid var(--line); }
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 14px; background: var(--surface);
  border-bottom: 2px solid #000; z-index: 50; gap: 8px;
}
```

Topbar anatomy (left → right): ☰ mobile toggle · `← HOME` chip (mono, bordered, `2px 2px 0 #000`) · tool title + uppercase mono kicker · spacer · **yellow brand chip** (e.g. `CK.win`) with black border and hard shadow.

On mobile the side panels become an overlay drawer behind a ☰ toggle; scrollbars are hidden globally (tools scroll via drag/touch).

### 4.2 Landing page

Bordered white cards on `--bg-2`, each carrying: tool name (w900), uppercase mono hint in `--charcoal-3`, one-sentence description, and a `brutalist-badge` keyword. Flagship tools get the yellow treatment.

---

## 5. Optional Enhancements (from the live app)

These aren't required by the visual system but complete the feel:

- **Tactile audio** — tiny interaction sounds on presses/changes (see [`src/lib/studio-sounds.ts`](../src/lib/studio-sounds.ts)); keep them < 100 ms and optional.
- **Stacked export widget** — a fanned stack of bordered cards (PNG/WebP/JPG) that spreads on hover, replacing a boring dropdown (see [`src/components/ExportButton.tsx`](../src/components/ExportButton.tsx)).
- **HUD panels** — for immersive overlays: `rgba(24,24,27,0.92)` + `backdrop-filter: blur(16px)`, 1px border, 10px radius — the one place soft glass is allowed.
- **Async font catalog** — load any display fonts non-blocking so first paint stays instant.

---

## 6. Porting Checklist (using this system in another project)

1. Paste the token block (§2.1) into your global stylesheet.
2. Add the button/card/badge CSS (§3.1–3.2) — plain CSS, works with any framework or none.
3. Set base typography: Inter (or Geist) for humans, monospace uppercase for machine chrome (§2.5).
4. Apply the tool-shell grid (§4.1) if you're building a workspace app; otherwise card-grid landing (§4.2).
5. Enforce the rules:
   - [ ] Borders are **2px solid #000** (1.5px on badges only)
   - [ ] Shadows are **hard offsets**, never blurred
   - [ ] Hover lifts, press sinks, ≤ 80 ms
   - [ ] Yellow ≤ 10% of any screen, primary CTA only
   - [ ] All chrome labels: **UPPERCASE mono, w700–900**
   - [ ] Selected = ink-inverted, never subtle
   - [ ] Radii: `0` inside dense tools, `4–6px` on cards/buttons
6. If you're on Tailwind: map the tokens to CSS variables in your theme config exactly like [`tailwind.config.ts`](../tailwind.config.ts) does for its shadcn layer, and keep the brutalist classes as plain CSS alongside utilities.

### Compatibility note

The original app runs **two coexisting layers**: a neutral shadcn/new-york token layer (OKLCH variables, dark-mode ready — see `:root` in [`src/app/globals.css`](../src/app/globals.css)) underneath the brutalist chrome described here. This document extracts only the brutalist layer, which is fully self-contained. If your target project needs shadcn components (dialogs, command palettes), keep that neutral layer as the base and let brutalism own buttons, cards, badges, and layout chrome.

---

*Companion document: [`docs/CREATORKIT_WHEN_TO_USE.md`](./CREATORKIT_WHEN_TO_USE.md) — when this application (and its design language) is the right choice.*
