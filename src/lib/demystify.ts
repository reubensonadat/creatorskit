/**
 * src/lib/demystify.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Demystify — turn a jagged idea into a numbered, checkable plan.
 * BYOK (bring-your-own-key) chat client + defensive plan normalization +
 * validated tool hand-off mapping.
 *
 * Keyring: groq/openai REUSE the captions BYOK keys (whisper-cloud.ts) — one
 * key per provider across the whole suite. Gemini gets its own slot, because
 * captions never persisted one. Keys live only in localStorage; the API proxy
 * receives them per-request and never stores or logs them.
 */

import { NATIVE_TOOLS } from '@/data/tools';
import { getStoredApiKey, setStoredApiKey } from './captions/whisper-cloud';

export type DemystifyProvider = 'groq' | 'openai' | 'gemini';

export interface DemystifyStep {
    title: string;
    detail: string;
    /** validated CreatorsKit slugs (no leading slash) — links can never hallucinate */
    tools: string[];
}

export interface DemystifyPlan {
    title: string;
    summary: string;
    steps: DemystifyStep[];
}

export interface DemystifyProviderInfo {
    id: DemystifyProvider;
    label: string;
    model: string;
    keyUrl: string;
    note: string;
}

export const DEMYSTIFY_PROVIDERS: DemystifyProviderInfo[] = [
    { id: 'groq', label: 'GROQ', model: 'llama-3.3-70b-versatile', keyUrl: 'https://console.groq.com/keys', note: 'FREE TIER · FASTEST START' },
    { id: 'openai', label: 'OPENAI', model: 'gpt-4o-mini', keyUrl: 'https://platform.openai.com/api-keys', note: 'GPT-4O MINI' },
    { id: 'gemini', label: 'GEMINI', model: 'gemini-3.8-flash', keyUrl: 'https://aistudio.google.com/apikey', note: 'FREE GOOGLE KEY' },
];

/**
 * Every in-house tool the model may attach to a step. The API route bakes the
 * annotated allowlist into its system prompt; the client re-validates against
 * this list, so a hallucinated slug simply never renders a link.
 */
export const DEMYSTIFY_TOOL_SLUGS = [
    'teleprompter', 'auto-captions', 'text-highlighter', 'match-cut', 'thumbnail-lab',
    'resizer', 'watermark', 'compressor', 'carousel-slicer', 'background-replace',
    'text-behind', 'quote-card', 'palette-extractor', 'color-gradient', 'sync-slate',
    'bouquet', 'business', 'video-grabber',
] as const;

/** Steps whose text is stashed via putHandoffText right before the tool opens. */
export const DEMYSTIFY_TEXT_HANDOFF_SLUGS = ['match-cut', 'text-highlighter'];

/** Compact chip labels — tools.ts labels are too long for step chips. */
export const DEMYSTIFY_SHORT_LABELS: Record<string, string> = {
    teleprompter: 'TELEPROMPTER',
    'auto-captions': 'AUTO CAPTIONS',
    'text-highlighter': 'TEXT HIGHLIGHTER',
    'match-cut': 'MATCH CUT',
    'thumbnail-lab': 'THUMBNAIL LAB',
    resizer: 'RESIZER',
    watermark: 'WATERMARK',
    compressor: 'COMPRESSOR',
    'carousel-slicer': 'CAROUSEL SLICER',
    'background-replace': 'BACKGROUND REMOVER',
    'text-behind': 'TEXT BEHIND',
    'quote-card': 'QUOTE CARD',
    'palette-extractor': 'PALETTE',
    'color-gradient': 'GRADIENT STUDIO',
    'sync-slate': 'SYNC SLATE',
    bouquet: 'BOUQUET',
    business: 'BUSINESS DOCS',
    'video-grabber': 'VIDEO GRABBER',
};

const GEMINI_KEY_STORAGE = 'creatorkit_byok_gemini_key';

export function getStoredDemystifyKey(provider: DemystifyProvider): string {
    if (provider === 'gemini') {
        if (typeof window === 'undefined') return '';
        return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
    }
    // groq/openai share the captions keyring — one key per provider, suite-wide
    return getStoredApiKey(provider);
}

export function setStoredDemystifyKey(provider: DemystifyProvider, key: string): void {
    if (provider === 'gemini') {
        if (typeof window === 'undefined') return;
        if (key) localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
        else localStorage.removeItem(GEMINI_KEY_STORAGE);
        return;
    }
    setStoredApiKey(provider, key);
}

export function providerInfo(id: DemystifyProvider): DemystifyProviderInfo {
    return DEMYSTIFY_PROVIDERS.find((p) => p.id === id) || DEMYSTIFY_PROVIDERS[0];
}

/**
 * Our pinned default per provider ("AUTO"). The API passes whatever model the
 * user picked; these are only the fallback — providers retire models (Gemini
 * killed 2.5-flash for new users 2026-10), so nothing here is load-bearing.
 */
export const RECOMMENDED_MODELS: Record<DemystifyProvider, string> = {
    groq: 'llama-3.3-70b-versatile',
    openai: 'gpt-4o-mini',
    gemini: 'gemini-3.8-flash',
};

/** Live model list straight from the provider (uses the user's own key). */
export async function listDemystifyModels(provider: DemystifyProvider, apiKey: string): Promise<string[]> {
    if (provider === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=100`);
        const data = await res.json().catch(() => null);
        return (data?.models || [])
            .filter((m: any) => typeof m?.name === 'string' && String(m.name).startsWith('models/'))
            .map((m: any) => String(m.name).slice('models/'.length))
            .filter((id: string) => id.includes('flash') || id.includes('pro'))
            .sort();
    }
    const base = provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.groq.com/openai/v1';
    const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const data = await res.json().catch(() => null);
    return (data?.data || [])
        .map((m: any) => m?.id)
        .filter((id: unknown): id is string => typeof id === 'string')
        .sort();
}

export function shortToolLabel(slug: string): string {
    return DEMYSTIFY_SHORT_LABELS[slug] || slug.toUpperCase();
}

/** Resolve a validated slug → { href, label } from tools.ts. null = not a real tool. */
export function demystifyToolLink(slug: string): { href: string; label: string } | null {
    if (!(DEMYSTIFY_TOOL_SLUGS as readonly string[]).includes(slug)) return null;
    const t = NATIVE_TOOLS.find((tool) => tool.href === `/${slug}`);
    if (!t) return null;
    return { href: t.href, label: t.label };
}

/** Strips ```json fences some models wrap around JSON payloads. */
export function stripJsonFences(raw: string): string {
    return raw
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();
}

/**
 * Defensive normalizer: whatever the model returned becomes a safe plan or
 * null. Unknown tool slugs are dropped, titles/details coerced and clamped,
 * step count capped at 12.
 */
export function normalizeDemystifyPlan(raw: unknown): DemystifyPlan | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    const title = typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim().slice(0, 120) : 'Your Plan';
    const summary = typeof obj.summary === 'string' ? obj.summary.trim().slice(0, 500) : '';
    if (!Array.isArray(obj.steps) || obj.steps.length === 0) return null;

    const steps: DemystifyStep[] = [];
    for (const s of obj.steps.slice(0, 12)) {
        if (!s || typeof s !== 'object') continue;
        const so = s as Record<string, unknown>;
        const stepTitle = typeof so.title === 'string' ? so.title.trim().slice(0, 120) : '';
        if (!stepTitle) continue;
        const detail = typeof so.detail === 'string' ? so.detail.trim().slice(0, 600) : '';
        const rawTools = Array.isArray(so.tools) ? so.tools : [];
        const tools = Array.from(
            new Set(
                rawTools
                    .filter((t): t is string => typeof t === 'string')
                    .map((t) => t.trim().toLowerCase().replace(/^\//, ''))
                    .filter((t) => (DEMYSTIFY_TOOL_SLUGS as readonly string[]).includes(t)),
            ),
        ).slice(0, 2);
        steps.push({ title: stepTitle, detail, tools });
    }
    if (steps.length === 0) return null;
    return { title, summary, steps };
}

/** Plan → shareable Markdown (clipboard + .md export). */
export function planToMarkdown(plan: DemystifyPlan, idea: string): string {
    const lines: string[] = [];
    lines.push(`# ${plan.title}`);
    if (plan.summary) lines.push('', plan.summary);
    lines.push('', '## Steps');
    plan.steps.forEach((s, i) => {
        lines.push('', `${i + 1}. **${s.title}**`);
        if (s.detail) lines.push(`   ${s.detail}`);
        if (s.tools.length > 0) {
            const links = s.tools
                .map((slug) => {
                    const link = demystifyToolLink(slug);
                    return link ? `[${link.label}](${link.href})` : slug;
                })
                .join(' · ');
            lines.push(`   → CreatorsKit: ${links}`);
        }
    });
    lines.push('', '---', 'Plan generated with CreatorsKit Demystify — creatorskit.win');
    if (idea.trim()) lines.push('', `> Idea: ${idea.trim()}`);
    return lines.join('\n');
}

/** Client call into the BYOK proxy. Throws Error(message) on failure. */
export async function generateDemystifyPlan(opts: {
    provider: DemystifyProvider;
    apiKey: string;
    idea: string;
    model?: string;
}): Promise<DemystifyPlan> {
    const res = await fetch('/api/demystify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: opts.provider, apiKey: opts.apiKey, idea: opts.idea.slice(0, 4000), model: opts.model || undefined }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.plan) {
        throw new Error(data?.error || `Demystify failed (${res.status}).`);
    }
    const plan = normalizeDemystifyPlan(data.plan);
    if (!plan) {
        throw new Error('The AI returned a plan we could not read. Try again or switch provider.');
    }
    return plan;
}
