# CreatorKit Viral Blog Engine: Case Study, Breakdown & Title Writing Guide

> **Transform any raw video transcript, reel, or concept into an authoritative, high-ranking, and high-converting CreatorKit Case Study.**

---

## 🏷️ Part 1: The CreatorKit Title Writing Formula

Every title on CreatorKit follows a tested, high-CTR **Paradox / Contrarian Formula**:

### The 4 Master Title Formulas:

1. **The Intuition Inversion Formula:**
   * `[The Common Belief/Myth] + "Why It Fails" + [The Counter-Intuitive Truth/Formula]`
   * *Example:* *The Illusion of Clarity: Why 99% of "Good" Videos Fail (And The Veritasium Formula)*
   * *Example:* *"Going Viral Doesn't Pay Your Rent": The Ghana & Nigeria Creator Guide to Real Sponsorship Income*

2. **The "Never Do X" High-Stakes Directive:**
   * `"Why You Should Never" + [Common Mistake] + [The Alternative That 10x's Results]`
   * *Example:* *Why You Should Never Charge "Per View": The Usage Rights Formula That 10x’s Brand Deals*

3. **The Neurological / Metaphor Mechanism:**
   * `[Metaphor / Scientific Law] + [How It Controls Viewer Behavior/Retention]`
   * *Example:* *The Casino Blueprint: Why Las Vegas Psychology Makes Storytelling Unskippable*
   * *Example:* *The 40Hz Sub-Bass Drop: How Sound Effects Control Viewer Pupil Dilation*

4. **The Empirical Benchmark:**
   * `[Metric / Test Name] + [The Concrete Percentage or Revenue Impact]`
   * *Example:* *The 1-Word Screen Rule: Why Kinetic Captions Boost Short-Form Completion by 43%*
   * *Example:* *The Loop Rate Anomaly: Why 110% Watch Time Trumps Likes Every Single Time*

---

## ⚡ Part 2: The 4-Step Dopamine Addiction Loop Architecture

When writing short-form scripts, case studies, or breakdowns, apply the **4-Step Dopamine Loop**:

```
[1. THE STAKES] ➔ [2. THE BIG QUESTION] ➔ [3. THE HEADFAKE] ➔ [4. THE REHOOK]
```

1. **Step 1: The Stakes (0:00 – 0:04)**
   * Gives the viewer a reason to care by introducing:
     * **A relatable character** to root for.
     * **A concrete consequence/risk** (losing money, failing a public test, missing a flight).
     * **Ticking urgency** (e.g. *"in just two weeks"*, *"before midnight"*).

2. **Step 2: The Big Question (0:04 – 0:08)**
   * Opens an irresistible curiosity gap like a live blackjack card flip.
   * Gives just enough context for a sharp, binary mystery to form in the viewer's mind.

3. **Step 3: The Headfake (0:08 – 0:20)**
   * The art of contrast: Leads the viewer to a 90% logical assumption (A), then violently snaps the narrative in a different direction to reveal unexpected truth (B).

4. **Step 4: The Cascading Rehook (0:20 – End)**
   * Deals the next hand instantly before dopamine drops to zero. Overlaps Loop #2 into the resolution of Loop #1 so completion rate stays above 100%.

---

## ⚖️ Part 3: The Fair Use & Copyright Protection Framework

* ❌ **Copy-pasting raw transcripts verbatim** = **Copyright Infringement & Low-Value SEO Penalty**.
* ✅ **Transformative Analysis (Our Method)** = **100% Legal & Fair Use Protected** (Criticism, Commentary, Research, and Education).
* **Attribution**: Always embed the source video/reel and provide clear credit at the bottom.

---

## 🗄️ Part 4: How a Database (Supabase) Stores and Formats This

When moving from static files to a database like **Supabase (PostgreSQL)**:

### 1. Database Schema (`posts` table):
```sql
create table posts (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  subtitle text not null,
  excerpt text not null,
  cover_image text,
  youtube_id text,
  instagram_url text,
  video_credit jsonb,
  tags text[],
  category text,
  content jsonb not null, -- Stores Acts, Tables, Quotes, and Checklists
  featured boolean default false,
  published_at timestamp with time zone default now()
);
```

### 2. How the Frontend Knows How to Format It:
The `content` column is stored as structured **JSON** (or Markdown). Because the React components (`<section>`, `<table >`, `<Quote>`, `<FormulaBox>`) read the JSON properties (`whatYoullLearn`, `sections`, `actionableChecklist`), the frontend automatically renders the exact styling without any manual CSS coding!
