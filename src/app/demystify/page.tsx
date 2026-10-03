'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Copy, Download, KeyRound, Trash2, Wand2 } from 'lucide-react';
import { ThinkingOrb } from 'thinking-orbs';

import {
    DEMYSTIFY_PROVIDERS,
    DEMYSTIFY_TEXT_HANDOFF_SLUGS,
    type DemystifyPlan,
    type DemystifyProvider,
    type DemystifyStep,
    demystifyToolLink,
    generateDemystifyPlan,
    getStoredDemystifyKey,
    listDemystifyModels,
    planToMarkdown,
    providerInfo,
    RECOMMENDED_MODELS,
    setStoredDemystifyKey,
    shortToolLabel,
} from '@/lib/demystify';
import AdBanner from '@/components/AdBanner';
import { putHandoffText } from '@/lib/tool-handoff';
import { loadState, saveState } from '@/lib/local-memory';

const EXAMPLE_IDEAS = [
    'How to stop procrastinating on my channel',
    'How do I start a YouTube channel with no gear?',
    'Editing my backlog feels huge — make it feel small',
];

interface PersistState {
    provider: DemystifyProvider;
    idea: string;
    plan: DemystifyPlan | null;
    checked: Record<number, boolean>;
    planMeta: { provider: string; model: string; createdAt: number } | null;
    modelPick?: string;
}

// ── The Demystify mind map (owner ruling 2026-10-03) ──────────────────────
// Not a picture OF a map — an infinite drill-down you walk yourself: root on
// the LEFT, sub-sections cascading RIGHT, children fanning up/down around
// their parent's midline. Square brutalist boxes; click one to open more.
// We template the tree from the plan text ourselves — the model only ever
// supplies the words (lesser models can't draw correct mind maps; we can).
interface MindNode {
    id: string;
    kind: 'root' | 'step' | 'point' | 'tools';
    label: string;
    stepIndex?: number;
    children: MindNode[];
}

const BRANCH_COLORS = ['#FFE500', '#06B6D4', '#EC4899', '#A78BFA', '#F97316', '#22C55E', '#FB7185', '#38BDF8'];

function splitSentences(text: string): string[] {
    return text
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 6);
}

function buildMindTree(plan: DemystifyPlan): MindNode {
    return {
        id: 'root',
        kind: 'root',
        label: plan.title,
        children: plan.steps.map((s, i) => ({
            id: `s${i}`,
            kind: 'step' as const,
            stepIndex: i,
            label: s.title,
            children: [
                ...splitSentences(s.detail).map((p, j) => ({
                    id: `s${i}p${j}`,
                    kind: 'point' as const,
                    label: p,
                    children: [],
                })),
                ...(s.tools.length
                    ? [
                          {
                              id: `s${i}t`,
                              kind: 'tools' as const,
                              label: `TOOLS: ${s.tools.map(shortToolLabel).join(' · ')}`,
                              children: [],
                          },
                      ]
                    : []),
            ],
        })),
    };
}

const NODE_STYLE: Record<MindNode['kind'], { w: number; cpl: number; fs: number }> = {
    root: { w: 208, cpl: 20, fs: 12 },
    step: { w: 216, cpl: 24, fs: 11 },
    point: { w: 252, cpl: 32, fs: 10.5 },
    tools: { w: 216, cpl: 28, fs: 10 },
};

interface LaidNode {
    node: MindNode;
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    parent?: LaidNode;
}

/** Left-to-right tidy tree: each parent centers on its children's block, so
 *  branches fan up/down off the trunk exactly like a hand-drawn mind map. */
function layoutMindTree(root: MindNode, open: Record<string, boolean>): { nodes: LaidNode[]; edges: { from: LaidNode; to: LaidNode }[]; w: number; h: number } {
    const nodes: LaidNode[] = [];
    const edges: { from: LaidNode; to: LaidNode }[] = [];
    const V_GAP = 26;
    const H_GAP = 84;

    const place = (n: MindNode, depth: number, top: number, color: string, parent?: LaidNode): { min: number; max: number } => {
        const st = NODE_STYLE[n.kind];
        const lines = Math.min(4, Math.max(1, Math.ceil(n.label.length / st.cpl)));
        const h = 18 + lines * 15;
        const w = st.w;
        const x = depth === 0 ? 28 : parent ? parent.x + parent.w + H_GAP : 28;
        const self: LaidNode = { node: n, x, y: 0, w, h, color, parent };
        nodes.push(self);
        if (parent) edges.push({ from: parent, to: self });

        const kids = n.kind === 'root' || open[n.id] ? n.children : [];
        if (!kids.length) {
            self.y = top + h / 2;
            return { min: top, max: top + h };
        }
        let cursor = top;
        for (let i = 0; i < kids.length; i++) {
            const kidColor = n.kind === 'root' ? BRANCH_COLORS[i % BRANCH_COLORS.length] : color;
            const ext = place(kids[i], depth + 1, cursor, kidColor, self);
            cursor = ext.max + V_GAP;
        }
        const blockBottom = cursor - V_GAP;
        self.y = (top + blockBottom) / 2;
        return { min: top, max: blockBottom };
    };

    const ext = place(root, 0, 28, '#000');
    const w = Math.max(...nodes.map((nn) => nn.x + nn.w)) + 28;
    const h = Math.max(ext.max + 28, 320);
    return { nodes, edges, w, h };
}

function PlanMindMap({ plan, checked }: { plan: DemystifyPlan; checked: Record<number, boolean> }) {
    const [open, setOpen] = useState<Record<string, boolean>>({});
    const tree = useMemo(() => buildMindTree(plan), [plan]);
    const laid = useMemo(() => layoutMindTree(tree, open), [tree, open]);

    return (
        <div
            style={{
                border: '2px solid #000',
                background: '#fff',
                backgroundImage: 'radial-gradient(rgba(0,0,0,0.10) 1px, transparent 1px)',
                backgroundSize: '18px 18px',
                overflow: 'auto',
                maxHeight: 560,
                position: 'relative',
            }}
        >
            <div style={{ position: 'relative', width: laid.w, height: laid.h, minWidth: '100%' }}>
                <svg width={laid.w} height={laid.h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {laid.edges.map(({ from, to }, i) => {
                        const x1 = from.x + from.w;
                        const y1 = from.y;
                        const x2 = to.x;
                        const y2 = to.y;
                        const mx = (x1 + x2) / 2;
                        return (
                            <path
                                key={`e${i}`}
                                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                                fill="none"
                                stroke={to.color}
                                strokeWidth={to.node.kind === 'step' ? 3 : 2}
                                opacity={to.node.kind === 'step' ? 0.95 : 0.55}
                            />
                        );
                    })}
                </svg>
                {laid.nodes.map((ln) => {
                    const hasKids = ln.node.children.length > 0;
                    const isOpen = !!open[ln.node.id];
                    const done = ln.node.stepIndex !== undefined && checked[ln.node.stepIndex];
                    return (
                        <button
                            key={ln.node.id}
                            type="button"
                            onClick={() => hasKids && setOpen((o) => ({ ...o, [ln.node.id]: !o[ln.node.id] }))}
                            className="ck-mm-node"
                            style={{
                                position: 'absolute',
                                left: ln.x,
                                top: ln.y - ln.h / 2,
                                width: ln.w,
                                minHeight: ln.h,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                textAlign: 'left',
                                cursor: hasKids ? 'pointer' : 'default',
                                border: `2px solid ${ln.node.kind === 'root' ? '#000' : done ? '#16a34a' : '#000'}`,
                                background: ln.node.kind === 'root' ? '#000' : done ? '#dcfce7' : '#fff',
                                color: ln.node.kind === 'root' ? '#fff' : '#000',
                                padding: '6px 10px',
                                boxShadow: `4px 4px 0 ${ln.node.kind === 'root' || ln.node.kind === 'step' ? '#000' : 'rgba(0,0,0,0.18)'}`,
                                fontFamily: 'monospace',
                                fontWeight: ln.node.kind === 'point' || ln.node.kind === 'tools' ? 600 : 800,
                                fontSize: NODE_STYLE[ln.node.kind].fs,
                                lineHeight: 1.35,
                                zIndex: 1,
                            }}
                        >
                            {ln.node.kind === 'step' && (
                                <span
                                    style={{
                                        flexShrink: 0,
                                        width: 18,
                                        height: 18,
                                        border: '2px solid #000',
                                        background: done ? '#16a34a' : ln.color,
                                        color: done ? '#fff' : '#000',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 9,
                                        fontWeight: 900,
                                    }}
                                >
                                    {done ? '✓' : (ln.node.stepIndex! + 1)}
                                </span>
                            )}
                            <span style={{ overflowWrap: 'anywhere' }}>
                                {ln.node.label}
                                {hasKids && (
                                    <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 900, color: ln.node.kind === 'root' ? '#FFE500' : '#666' }}>
                                        {isOpen ? '▾' : '▸'}
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Staged thinking journey while the AI works (owner ruling 2026-10-03):
// the orb must tell a story — reading → finding → shrinking → wiring →
// composing — so the wait itself feels like progress, not a frozen spinner.
const BUSY_STAGES = [
    { orb: 'working', label: 'READING YOUR IDEA…', caption: 'GRABBING THE TASK YOU KEEP AVOIDING' },
    { orb: 'searching', label: 'FINDING THE STEPS THAT MATTER…', caption: 'SCANNING FOR WHAT ACTUALLY MOVES THE NEEDLE' },
    { orb: 'solving', label: 'MAKING THE BIG TASK SMALL…', caption: 'ORDERING EVERYTHING INTO DOABLE CHUNKS' },
    { orb: 'connecting', label: 'WIRING IN CREATORSKIT TOOLS…', caption: 'MATCHING EACH STEP TO THE TOOL THAT DOES IT' },
    { orb: 'composing', label: 'GENERATING YOUR PLAN + MIND MAP…', caption: 'ALMOST THERE — YOUR CHUNKS ARE BEING DRAWN' },
] as const;

export default function DemystifyPage() {
    const [provider, setProvider] = useState<DemystifyProvider>('groq');
    const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
    const [hasKey, setHasKey] = useState<Record<string, boolean>>({});
    const [idea, setIdea] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [plan, setPlan] = useState<DemystifyPlan | null>(null);
    const [checked, setChecked] = useState<Record<number, boolean>>({});
    const [copied, setCopied] = useState(false);
    const [planMeta, setPlanMeta] = useState<PersistState['planMeta']>(null);
    const [modelPick, setModelPick] = useState('');
    const [modelList, setModelList] = useState<string[]>([]);
    const [modelBusy, setModelBusy] = useState(false);
    const [busyStage, setBusyStage] = useState(0);
    const [autoSwitched, setAutoSwitched] = useState('');
    const restoredRef = useRef(false);

    // ── Restore last session (IndexedDB via local-memory) + refresh keyring ──
    useEffect(() => {
        if (restoredRef.current) return;
        restoredRef.current = true;
        (async () => {
            const presence: Record<string, boolean> = {};
            for (const p of DEMYSTIFY_PROVIDERS) presence[p.id] = !!getStoredDemystifyKey(p.id);
            setHasKey(presence);

            const saved = await loadState<PersistState>('demystify');
            if (saved?.state) {
                setProvider(saved.state.provider || 'groq');
                setModelPick(saved.state.modelPick || '');
                if (saved.state.idea) setIdea(saved.state.idea);
                if (saved.state.plan) {
                    setPlan(saved.state.plan);
                    setChecked(saved.state.checked || {});
                    setPlanMeta(saved.state.planMeta || null);
                }
            }
        })();
    }, []);

    // ── Persist (skip until restore finished) ──
    useEffect(() => {
        if (!restoredRef.current) return;
        saveState('demystify', 'last-plan', { provider, idea, plan, checked, planMeta, modelPick }).catch(() => {});
    }, [provider, idea, plan, checked, planMeta, modelPick]);

    // ── Auto-fetch the model list on arrival / provider switch / key save ──
    // Owner ruling (2026-10-03): land ready — the user should never have to
    // press FETCH MODELS themselves. Silent: on failure AUTO keeps working.
    useEffect(() => {
        const key = getStoredDemystifyKey(provider);
        if (!key) return;
        let cancelled = false;
        setModelBusy(true);
        listDemystifyModels(provider, key)
            .then((models) => {
                if (!cancelled && models.length) setModelList(models);
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setModelBusy(false);
            });
        return () => {
            cancelled = true;
        };
    }, [provider, hasKey[provider]]);

    // ── Staged thinking journey: advance every 2.4s while busy, hold the last ──
    useEffect(() => {
        if (!busy) return;
        setBusyStage(0);
        const t = setInterval(() => {
            setBusyStage((s) => Math.min(s + 1, BUSY_STAGES.length - 1));
        }, 2400);
        return () => clearInterval(t);
    }, [busy]);

    const handleSaveKey = () => {
        const draft = (keyDrafts[provider] || '').trim();
        setStoredDemystifyKey(provider, draft);
        setHasKey((h) => ({ ...h, [provider]: !!draft }));
        setKeyDrafts((d) => ({ ...d, [provider]: '' }));
    };

    const handleClearKey = () => {
        setStoredDemystifyKey(provider, '');
        setHasKey((h) => ({ ...h, [provider]: false }));
        setKeyDrafts((d) => ({ ...d, [provider]: '' }));
    };

    const handleFetchModels = async () => {
        const key = getStoredDemystifyKey(provider) || (keyDrafts[provider] || '').trim();
        if (!key) {
            setError(`Save your ${providerInfo(provider).label} key first — the model list is fetched with YOUR key.`);
            return;
        }
        setModelBusy(true);
        try {
            const models = await listDemystifyModels(provider, key);
            setModelList(models);
            if (!models.length) setError('No models came back — try again or stay on AUTO.');
        } catch {
            setError('Could not fetch the model list — AUTO still works.');
        } finally {
            setModelBusy(false);
        }
    };

    const handleGenerate = async () => {
        if (busy) return;
        setError('');
        setAutoSwitched('');
        if (!idea.trim()) {
            setError('Type your idea first — rough is fine.');
            return;
        }
        const key = getStoredDemystifyKey(provider) || (keyDrafts[provider] || '').trim();
        if (!key) {
            setError(`Add your ${providerInfo(provider).label} API key in AI SETTINGS below — the free Groq key takes about 30 seconds to get.`);
            return;
        }
        setBusy(true);
        // Auto-cycle rule (owner ruling 2026-10-03): work through the
        // provider's models until one gives a proper plan — the user should
        // never have to intervene. Bounded at 4 attempts; any non-model
        // error (bad key, empty idea) stops the loop immediately.
        const primary = modelPick || RECOMMENDED_MODELS[provider];
        const candidates = [primary, ...modelList.filter((m) => m !== primary)];
        if (!candidates.includes(RECOMMENDED_MODELS[provider])) candidates.push(RECOMMENDED_MODELS[provider]);
        const tries = candidates.slice(0, 4);
        let nextPlan: DemystifyPlan | null = null;
        let usedModel = tries[0];
        try {
            for (let i = 0; i < tries.length; i++) {
                try {
                    nextPlan = await generateDemystifyPlan({ provider, apiKey: key, idea, model: tries[i] });
                    usedModel = tries[i];
                    if (i > 0) {
                        const dropped = tries.slice(0, i).join(', ');
                        setAutoSwitched(`${dropped} ${i > 1 ? 'were' : 'was'} unavailable — we auto-switched to ${tries[i]} for you.`);
                    }
                    break;
                } catch (first: any) {
                    const msg = String(first?.message || '');
                    if (!/no longer available|busy right now|rate limit|couldn't finish/i.test(msg)) throw first;
                    // model-level failure → try the next candidate automatically
                }
            }
            if (!nextPlan) {
                throw new Error(`None of the ${providerInfo(provider).label} models we tried responded. Wait a moment and try again.`);
            }
            setPlan(nextPlan);
            setChecked({});
            setPlanMeta({
                provider: providerInfo(provider).label,
                model: usedModel,
                createdAt: Date.now(),
            });
        } catch (e: any) {
            setError(e?.message || 'Something went wrong. Try again.');
        } finally {
            setBusy(false);
        }
    };

    const openToolChip = async (slug: string, step: DemystifyStep) => {
        if (DEMYSTIFY_TEXT_HANDOFF_SLUGS.includes(slug)) {
            try {
                await putHandoffText(slug, `${step.title}\n\n${step.detail}`, { sourceTool: 'demystify' });
            } catch {
                /* best-effort — the target still opens */
            }
        }
        window.open(`/${slug}`, '_blank');
    };

    const copyPlan = async () => {
        if (!plan) return;
        try {
            await navigator.clipboard.writeText(planToMarkdown(plan, idea));
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            /* clipboard unavailable */
        }
    };

    const downloadPlan = (kind: 'md' | 'json') => {
        if (!plan) return;
        const content = kind === 'md' ? planToMarkdown(plan, idea) : JSON.stringify({ idea, plan }, null, 2);
        const blob = new Blob([content], { type: kind === 'md' ? 'text/markdown' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `creatorskit-plan.${kind}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const resetPlan = () => {
        setPlan(null);
        setChecked({});
        setPlanMeta(null);
        setError('');
        setAutoSwitched('');
    };

    const done = plan ? plan.steps.filter((_, i) => checked[i]).length : 0;
    const activeInfo = providerInfo(provider);

    return (
        <div className="tool-page-padding" style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', boxSizing: 'border-box', width: '100%' }}>
            <div className="grid-bg" />
            <div className="tool-inner-container" style={{ maxWidth: 960, margin: '0 auto', padding: '56px 24px 96px', position: 'relative', zIndex: 1 }}>
                {/* Top Title Section */}
                <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 900, padding: '3px 8px', border: '2px solid #000', background: '#000', color: '#fff', fontFamily: 'monospace' }}>
                            DEMYSTIFY
                        </span>
                        <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>
                            BIG TASK → SMALL CHUNKS → THE TOOL THAT DOES EACH ONE
                        </span>
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', margin: 0, textTransform: 'uppercase' }}>
                        Demystify — make the big task small
                    </h1>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-muted)', maxWidth: 680, fontWeight: 500 }}>
                        How to stop procrastinating: type the thing you keep avoiding — a jagged idea, a skill, a backlog — and
                        your AI turns it into small, checkable chunks plus a mind map. Any step CreatorsKit can execute opens the
                        exact tool for it (that part Gemini won't do for you). One plan per idea — no endless chat. Bring your own
                        key; it never leaves your browser.
                    </p>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="brutalist-card" style={{ padding: '12px 16px', marginBottom: 16, background: '#fff', border: '2px solid #000', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#b91c1c', lineHeight: 1.5 }}>{error}</span>
                    </div>
                )}

                {/* IDEA card */}
                <div className="brutalist-card" style={{ padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.08em' }}>1 · YOUR JAGGED IDEA</div>
                    <textarea
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        rows={4}
                        placeholder="e.g. how do I stop procrastinating on my videos? or: I want to review phones but where do I even start…"
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            border: '2px solid #000',
                            padding: '12px 14px',
                            fontSize: '0.95rem',
                            fontFamily: 'inherit',
                            lineHeight: 1.6,
                            resize: 'vertical',
                            background: '#fff',
                            color: '#000',
                        }}
                    />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {EXAMPLE_IDEAS.map((ex) => (
                            <button
                                key={ex}
                                className="brutalist-button"
                                style={{ fontSize: '0.62rem', padding: '5px 10px' }}
                                onClick={() => setIdea(ex)}
                                type="button"
                            >
                                {ex}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <button
                            className="brutalist-button brutalist-button-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}
                            onClick={handleGenerate}
                            disabled={busy || !idea.trim()}
                            type="button"
                        >
                            {busy ? <ThinkingOrb state={BUSY_STAGES[busyStage].orb} size={20} /> : <Wand2 size={15} />}
                            {busy ? 'DEMYSTIFYING…' : plan ? 'REGENERATE PLAN' : 'DEMYSTIFY'}
                        </button>
                        {plan && !busy && (
                            <button className="brutalist-button" style={{ fontSize: '0.72rem', padding: '7px 12px' }} onClick={resetPlan} type="button">
                                START OVER
                            </button>
                        )}
                        <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: '#888', fontWeight: 700 }}>
                            {activeInfo.label} · {modelPick || activeInfo.model}
                        </span>
                        {autoSwitched && !busy && (
                            <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 700, color: '#15803d' }}>
                                ✓ {autoSwitched}
                            </span>
                        )}
                    </div>
                </div>

                {/* Thinking journey — staged orb + narration while the AI works */}
                {busy && (
                    <div className="brutalist-card" style={{ padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                        <ThinkingOrb state={BUSY_STAGES[busyStage].orb} size={64} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 220 }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 900, letterSpacing: '0.02em' }}>
                                {BUSY_STAGES[busyStage].label}
                            </span>
                            <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 700, color: '#888' }}>
                                {BUSY_STAGES[busyStage].caption} · {activeInfo.label} · {modelPick || activeInfo.model}
                            </span>
                            <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
                                {BUSY_STAGES.map((s, i) => (
                                    <span
                                        key={s.orb}
                                        title={s.label}
                                        style={{ width: 22, height: 6, border: '2px solid #000', background: i <= busyStage ? '#000' : '#fff' }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* AI SETTINGS card */}
                <div className="brutalist-card" style={{ padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.08em' }}>2 · AI SETTINGS — YOUR KEY, YOUR AI</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {DEMYSTIFY_PROVIDERS.map((p) => {
                            const active = provider === p.id;
                            return (
                                <button
                                    key={p.id}
                                    className="brutalist-button"
                                    style={{
                                        fontSize: '0.68rem',
                                        padding: '7px 12px',
                                        background: active ? '#000' : '#fff',
                                        color: active ? '#fff' : '#000',
                                    }}
                                    onClick={() => setProvider(p.id)}
                                    type="button"
                                    title={p.note}
                                >
                                    {p.label}
                                    {hasKey[p.id] ? ' ✓' : ''}
                                </button>
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, border: '2px solid #000', padding: '6px 10px', background: '#fff' }}>
                            <KeyRound size={15} style={{ flexShrink: 0, color: '#000' }} />
                            <input
                                type="password"
                                value={keyDrafts[provider] || ''}
                                onChange={(e) => setKeyDrafts((d) => ({ ...d, [provider]: e.target.value }))}
                                placeholder={hasKey[provider] ? 'Key saved ✓ — paste a new one to replace' : `Paste your ${activeInfo.label} API key…`}
                                style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: '0.8rem', fontFamily: 'monospace', background: 'transparent', color: '#000' }}
                                autoComplete="off"
                                spellCheck={false}
                            />
                        </div>
                        <button className="brutalist-button" style={{ fontSize: '0.68rem', padding: '8px 12px' }} onClick={handleSaveKey} type="button">
                            SAVE KEY
                        </button>
                        {hasKey[provider] && (
                            <button className="brutalist-button" style={{ fontSize: '0.68rem', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 4 }} onClick={handleClearKey} type="button" title="Remove stored key">
                                <Trash2 size={13} /> CLEAR
                            </button>
                        )}
                        <a
                            href={activeInfo.keyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="brutalist-button"
                            style={{ fontSize: '0.68rem', padding: '8px 12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                            GET KEY <ArrowUpRight size={13} />
                        </a>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.7rem', lineHeight: 1.6, color: 'var(--text-hint)', fontFamily: 'monospace', fontWeight: 600 }}>
                        {activeInfo.note} · SAME KEY AS AUTO CAPTIONS (GROQ/OPENAI) — ONE KEY WORKS EVERYWHERE IN CREATORSKIT · STORED ONLY IN
                        THIS BROWSER, PASSED STRAIGHT TO {activeInfo.label}, NEVER SAVED ON OUR SERVERS.
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '0.08em', color: '#666' }}>MODEL</span>
                        <button
                            className="brutalist-button"
                            style={{ fontSize: '0.66rem', padding: '6px 10px', background: !modelPick ? '#000' : '#fff', color: !modelPick ? '#fff' : '#000' }}
                            onClick={() => setModelPick('')}
                            type="button"
                            title={`Auto — ${RECOMMENDED_MODELS[provider]}`}
                        >
                            AUTO · {RECOMMENDED_MODELS[provider]}
                        </button>
                        <select
                            value={modelPick}
                            onChange={(e) => setModelPick(e.target.value)}
                            disabled={!modelList.length}
                            style={{ border: '2px solid #000', background: '#fff', fontSize: '0.72rem', fontFamily: 'monospace', padding: '6px 8px', color: '#000', maxWidth: 260 }}
                        >
                            <option value="">{modelList.length ? '— pick a model —' : '— fetch list —'}</option>
                            {modelList.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                        <button className="brutalist-button" style={{ fontSize: '0.66rem', padding: '6px 10px' }} onClick={handleFetchModels} disabled={modelBusy} type="button">
                            {modelBusy ? 'FETCHING…' : 'FETCH MODELS'}
                        </button>
                    </div>
                    <details key={provider} open style={{ border: '2px solid #000', background: '#fff' }}>
                        <summary style={{ padding: '10px 12px', cursor: 'pointer', fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                            HOW TO GET YOUR {activeInfo.label} KEY — 3 STEPS, FREE
                        </summary>
                        <ol style={{ margin: 0, padding: '2px 12px 12px 34px', fontSize: '0.78rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 500 }}>
                            {provider === 'gemini' ? (
                                <>
                                    <li>
                                        Tap <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ fontWeight: 800, color: '#000' }}>OPEN GOOGLE AI STUDIO ↗</a> — works
                                        on your phone, signs in with your Google account.
                                    </li>
                                    <li>
                                        Tap <strong>Create API key</strong>. If it asks you to accept the terms first, accept — the key is free.
                                    </li>
                                    <li>
                                        Copy the key (it starts with <code>AIza…</code>), paste it in the box above and tap <strong>SAVE KEY</strong>. Done — it stays in this
                                        browser.
                                    </li>
                                </>
                            ) : provider === 'groq' ? (
                                <>
                                    <li>
                                        Tap <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ fontWeight: 800, color: '#000' }}>OPEN GROQ KEYS ↗</a> and sign
                                        in with email or Google.
                                    </li>
                                    <li>
                                        Tap <strong>Create API Key</strong> and give it any name.
                                    </li>
                                    <li>
                                        Copy the key (starts with <code>gsk_…</code>), paste it above, tap <strong>SAVE KEY</strong>.
                                    </li>
                                </>
                            ) : (
                                <>
                                    <li>
                                        Tap <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{ fontWeight: 800, color: '#000' }}>OPEN OPENAI KEYS ↗</a> and
                                        log in.
                                    </li>
                                    <li>
                                        Tap <strong>Create new secret key</strong>.
                                    </li>
                                    <li>
                                        Copy the key (starts with <code>sk-…</code>), paste it above, tap <strong>SAVE KEY</strong>.
                                    </li>
                                </>
                            )}
                        </ol>
                    </details>
                </div>

                {/* PLAN card */}
                {plan ? (
                    <div className="brutalist-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 4 }}>3 · YOUR PLAN</div>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>{plan.title}</h2>
                            </div>
                            {planMeta && (
                                <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', border: '2px solid #eee', padding: '4px 8px', whiteSpace: 'nowrap' }}>
                                    {planMeta.provider} · {planMeta.model} · {new Date(planMeta.createdAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>

                        {plan.summary && <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--text-muted)', fontWeight: 500 }}>{plan.summary}</p>}

                        {/* Progress */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 800, marginBottom: 4 }}>
                                <span>PROGRESS</span>
                                <span>
                                    {done}/{plan.steps.length} DONE
                                </span>
                            </div>
                            <div style={{ height: 10, border: '2px solid #000', background: '#fff' }}>
                                <div style={{ height: '100%', background: '#000', width: `${Math.round((done / plan.steps.length) * 100)}%`, transition: 'width 0.2s ease' }} />
                            </div>
                        </div>

                        {/* Steps */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {plan.steps.map((s, i) => (
                                <div
                                    key={i}
                                    className="brutalist-card"
                                    style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start', opacity: checked[i] ? 0.55 : 1, background: '#fff' }}
                                >
                                    <button
                                        onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
                                        aria-label={checked[i] ? `Mark step ${i + 1} undone` : `Mark step ${i + 1} done`}
                                        style={{
                                            width: 26,
                                            height: 26,
                                            flexShrink: 0,
                                            border: '2px solid #000',
                                            background: checked[i] ? '#000' : '#fff',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: 0,
                                        }}
                                        type="button"
                                    >
                                        {checked[i] && <Check size={15} strokeWidth={3.5} />}
                                    </button>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 900, color: '#999' }}>{String(i + 1).padStart(2, '0')}</span>
                                            <span style={{ fontWeight: 900, fontSize: '0.95rem', textDecoration: checked[i] ? 'line-through' : 'none' }}>{s.title}</span>
                                        </div>
                                        {s.detail && (
                                            <p style={{ margin: '6px 0 0', fontSize: '0.83rem', lineHeight: 1.6, color: 'var(--text-muted)', fontWeight: 500 }}>{s.detail}</p>
                                        )}
                                        {s.tools.length > 0 && (
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                                                {s.tools.map((slug) => {
                                                    const link = demystifyToolLink(slug);
                                                    if (!link) return null;
                                                    const label = `OPEN ${shortToolLabel(slug)} ↗`;
                                                    return DEMYSTIFY_TEXT_HANDOFF_SLUGS.includes(slug) ? (
                                                        <button
                                                            key={slug}
                                                            className="brutalist-button"
                                                            style={{ fontSize: '0.62rem', padding: '5px 10px' }}
                                                            onClick={() => openToolChip(slug, s)}
                                                            title="Sends this step's text to the tool, then opens it"
                                                            type="button"
                                                        >
                                                            {label}
                                                        </button>
                                                    ) : (
                                                        <Link
                                                            key={slug}
                                                            href={link.href}
                                                            target="_blank"
                                                            className="brutalist-button"
                                                            style={{ fontSize: '0.62rem', padding: '5px 10px', textDecoration: 'none', display: 'inline-block' }}
                                                        >
                                                            {label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Export actions */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4, borderTop: '2px solid #eee' }}>
                            <button className="brutalist-button" style={{ fontSize: '0.68rem', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={copyPlan} type="button">
                                {copied ? <Check size={13} /> : <Copy size={13} />}
                                {copied ? 'COPIED!' : 'COPY PLAN'}
                            </button>
                            <button className="brutalist-button" style={{ fontSize: '0.68rem', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => downloadPlan('md')} type="button">
                                <Download size={13} /> .MD
                            </button>
                            <button className="brutalist-button" style={{ fontSize: '0.68rem', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => downloadPlan('json')} type="button">
                                <Download size={13} /> .JSON
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="brutalist-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
                        <ThinkingOrb state="breathing" size={64} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>Your plan appears here</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--text-muted)', maxWidth: 500, fontWeight: 500 }}>
                            5–9 small, checkable chunks plus a mind map of the whole plan — and when CreatorsKit can execute a step, a
                            button opens the exact tool for it (that's the part a plain chatbot won't do). No endless conversation, no
                            sign-up, no server storage: your key stays in this browser and goes straight to your chosen AI.
                        </p>
                    </div>
                )}
                {plan && (
                    <div className="brutalist-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.08em' }}>4 · MIND MAP — WALK IT, OPEN IT, KEEP GOING</div>
                        <PlanMindMap plan={plan} checked={checked} />
                        <p style={{ margin: 0, fontSize: '0.68rem', fontFamily: 'monospace', color: 'var(--text-hint)', fontWeight: 600 }}>
                            CLICK A BOX TO OPEN ITS SUB-SECTIONS — THE MAP KEEPS GROWING TO THE RIGHT. TICK STEPS IN THE LIST ABOVE.
                        </p>
                    </div>
                )}
                <div style={{ marginTop: 24 }}>
                    <AdBanner slot="leaderboard" />
                </div>
            </div>
        </div>
    );
}
