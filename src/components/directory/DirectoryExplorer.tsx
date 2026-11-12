'use client';

/**
 * DirectoryExplorer — the /components hub (owner pet feature, 2026-11-05).
 *
 * One page, two modes:
 *   · BROWSE — every site in src/data/component-directory.ts as a brutalist
 *     card, filterable by category.
 *   · SEARCH — type "3d button", every listed library is queried in parallel
 *     by /api/component-search (their sitemaps + Bing site: search) and the
 *     real component pages come back grouped by source. A source that fails
 *     or has nothing still renders its "open search on X ↗" deep link, so a
 *     search never dead-ends.
 *
 * Styling follows the house neobrutalist system: #f4f4f5 canvas, 3px black
 * borders, hard offset shadows, #FFE500 yellow actions, #dc2626 mono labels.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    ArrowUpRight,
    Heart,
    Loader2,
    Search,
    Sparkles,
    X,
} from 'lucide-react';
import {
    COMPONENT_SITES,
    DIRECTORY_CATEGORIES,
    ORDERED_SITES,
    categoryById,
    faviconFor,
    resolveSearchUrl,
    type ComponentSite,
    type DirectoryCategoryId,
} from '@/data/component-directory';
import type { DirectorySearchResponse, DirectorySourceReport } from '@/app/api/component-search/route';
import { useSiteLikes } from '@/lib/directory-likes';

// ─── House style helpers ──────────────────────────────────────────────────────

const PRICING_COLORS: Record<ComponentSite['pricing'], string> = {
    FREE: '#16a34a',
    'FREE + PRO': '#d97706',
    PAID: '#dc2626',
};

const EXAMPLE_QUERIES = ['3d button', 'toggle', 'loader', 'hero section', 'glass card', 'marquee', 'sidebar'];

function hoverLift(el: HTMLElement, on: boolean, baseShadow: string) {
    el.style.transform = on ? 'translate(-2px, -2px)' : 'none';
    el.style.boxShadow = on ? baseShadow.replace(/[\d.]+px/g, (m) => `${parseFloat(m) + 2}px`) : baseShadow;
}

// ─── Shelf search: match the directory's own descriptions ─────────────────────
// Owner ruling 2026-11-10: typing in the bar instantly searches the entries
// themselves — name, tagline, description, tags, stack, bestFor, highlights —
// and the matches render grouped under their category (the "skills"). Enter
// then layers the federated web sweep on top.

interface ShelfMatchGroup {
    id: DirectoryCategoryId;
    label: string;
    sites: ComponentSite[];
}

function shelfScore(site: ComponentSite, tokens: string[]): number {
    const cat = categoryById(site.category);
    const fields: Array<[string, number]> = [
        [site.name.toLowerCase(), 8],
        [site.tagline.toLowerCase(), 5],
        [site.tags.join(' ').toLowerCase(), 4],
        [site.stack.join(' ').toLowerCase(), 4],
        [site.description.toLowerCase(), 3],
        [site.highlights.join(' ').toLowerCase(), 2],
        [site.bestFor.join(' ').toLowerCase(), 2],
        [cat.label.toLowerCase(), 2],
    ];
    let score = 0;
    for (const token of tokens) {
        let hit = 0;
        for (const [text, weight] of fields) {
            if (text.includes(token)) hit += weight;
        }
        if (!hit) return 0; // every word must match somewhere (AND search)
        score += hit;
    }
    return score;
}

function matchShelfSites(raw: string): ComponentSite[] {
    const tokens = raw.trim().toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
    if (!tokens.length) return [];
    return ORDERED_SITES
        .map((site, i) => ({ site, i, score: shelfScore(site, tokens) }))
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score || a.i - b.i)
        .map((m) => m.site);
}

/** Group matched sites under their category; group order follows each group's best-matched site. */
function groupSitesByCategory(sites: ComponentSite[]): ShelfMatchGroup[] {
    const groups: ShelfMatchGroup[] = [];
    const at = new Map<DirectoryCategoryId, number>();
    for (const s of sites) {
        const found = at.get(s.category);
        if (found === undefined) {
            at.set(s.category, groups.length);
            groups.push({ id: s.category, label: categoryById(s.category).label, sites: [s] });
        } else {
            groups[found].sites.push(s);
        }
    }
    return groups;
}

/** A mono category header (the "skill") with its matched cards underneath. */
function CategorySection({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 12, height: 12, background: '#000', flexShrink: 0 }} aria-hidden="true" />
                <h2 style={{ margin: 0, fontFamily: 'monospace', fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.1em' }}>{label}</h2>
                <span style={{ fontFamily: 'monospace', fontSize: '0.62rem', fontWeight: 800, color: '#888' }}>({count})</span>
                <span style={{ flex: 1, height: '2px', background: '#000', minWidth: 20 }} aria-hidden="true" />
            </div>
            {children}
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PricingBadge({ pricing }: { pricing: ComponentSite['pricing'] }) {
    return (
        <span
            style={{
                fontFamily: 'monospace',
                fontSize: '0.58rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: PRICING_COLORS[pricing],
                border: '1.5px solid #000',
                borderRadius: 4,
                padding: '2px 6px',
                background: '#fff',
                whiteSpace: 'nowrap',
            }}
        >
            {pricing}
        </span>
    );
}

function SiteCard({
    site,
    liked,
    onToggleLike,
}: {
    site: ComponentSite;
    liked: boolean;
    onToggleLike: () => void;
}) {
    const cat = categoryById(site.category);
    return (
        <div
            style={{
                background: '#fff',
                border: '3px solid #000',
                borderRadius: 10,
                boxShadow: '5px 5px 0 #000',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                transition: 'transform 0.12s ease, box-shadow 0.12s ease',
            }}
            onMouseEnter={(e) => hoverLift(e.currentTarget, true, '5px 5px 0 #000')}
            onMouseLeave={(e) => hoverLift(e.currentTarget, false, '5px 5px 0 #000')}
        >
            {/* head: favicon + name + pricing */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                    style={{
                        width: 34,
                        height: 34,
                        flexShrink: 0,
                        border: '2px solid #000',
                        borderRadius: 7,
                        background: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        overflow: 'hidden',
                    }}
                >
                    { }
                    <img src={faviconFor(site.domain)} alt="" width={20} height={20} style={{ display: 'block' }} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <Link
                        href={`/components/${site.slug}`}
                        style={{
                            fontWeight: 900,
                            fontSize: '1rem',
                            color: '#000',
                            textDecoration: 'none',
                            letterSpacing: '-0.02em',
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {site.name}
                        {site.featured && (
                            <span
                                style={{
                                    display: 'inline-block',
                                    marginLeft: 6,
                                    verticalAlign: 'middle',
                                    fontFamily: 'monospace',
                                    fontSize: '0.52rem',
                                    fontWeight: 800,
                                    background: '#FFE500',
                                    border: '1.5px solid #000',
                                    borderRadius: 4,
                                    padding: '1px 4px',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                PICK
                            </span>
                        )}
                    </Link>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.58rem', fontWeight: 700, color: '#888', letterSpacing: '0.08em' }}>
                        {cat.label}
                    </span>
                </div>
                <PricingBadge pricing={site.pricing} />
                <button
                    onClick={onToggleLike}
                    aria-pressed={liked}
                    aria-label={liked ? `Unlike ${site.name}` : `Like ${site.name} — moves it to your top`}
                    title={liked ? 'Liked — pinned at your top (re-like to re-promote)' : 'Like — rises to your top'}
                    style={{
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        width: 30,
                        height: 30,
                        background: liked ? '#dc2626' : '#fff',
                        border: '2px solid #000',
                        borderRadius: 7,
                        cursor: 'pointer',
                        boxShadow: '2px 2px 0 #000',
                    }}
                    onMouseEnter={(e) => hoverLift(e.currentTarget, true, '2px 2px 0 #000')}
                    onMouseLeave={(e) => hoverLift(e.currentTarget, false, '2px 2px 0 #000')}
                >
                    <Heart size={14} strokeWidth={2.75} fill={liked ? '#fff' : 'none'} color={liked ? '#fff' : '#000'} />
                </button>
            </div>

            {/* tagline */}
            <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.45, color: '#444', fontWeight: 500, flex: 1 }}>
                {site.tagline}
            </p>

            {/* tags */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {site.tags.map((t) => (
                    <span
                        key={t}
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '0.58rem',
                            fontWeight: 700,
                            color: '#666',
                            background: '#f4f4f5',
                            border: '1px solid #d4d4d4',
                            borderRadius: 4,
                            padding: '2px 6px',
                        }}
                    >
                        {t}
                    </span>
                ))}
            </div>

            {/* footer: detail + open */}
            <div style={{ display: 'flex', gap: 8, borderTop: '2px solid #000', paddingTop: 10 }}>
                <Link
                    href={`/components/${site.slug}`}
                    style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '7px 10px',
                        background: '#FFE500',
                        color: '#000',
                        border: '2px solid #000',
                        borderRadius: 6,
                        fontWeight: 900,
                        fontSize: '0.68rem',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textDecoration: 'none',
                        boxShadow: '2px 2px 0 #000',
                    }}
                >
                    Details
                </Link>
                <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        padding: '7px 10px',
                        background: '#fff',
                        color: '#000',
                        border: '2px solid #000',
                        borderRadius: 6,
                        fontWeight: 900,
                        fontSize: '0.68rem',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textDecoration: 'none',
                        boxShadow: '2px 2px 0 #000',
                    }}
                >
                    Open <ArrowUpRight size={13} strokeWidth={2.75} />
                </a>
            </div>
        </div>
    );
}

function statusBadge(report: DirectorySourceReport): { label: string; color: string } {
    switch (report.status) {
        case 'ok':
            return { label: `${report.results.length} FOUND`, color: '#16a34a' };
        case 'empty':
            return { label: 'NO MATCH', color: '#888' };
        case 'error':
            return { label: 'BLOCKED/LIVE OFF', color: '#dc2626' };
        default:
            return { label: 'QUICK LINK', color: '#888' };
    }
}

function SourceReportCard({ report }: { report: DirectorySourceReport }) {
    const badge = statusBadge(report);
    return (
        <div
            style={{
                background: '#fff',
                border: '3px solid #000',
                borderRadius: 10,
                boxShadow: '4px 4px 0 #000',
                overflow: 'hidden',
            }}
        >
            {/* source header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    borderBottom: '2px solid #000',
                    background: '#FAFAFA',
                    flexWrap: 'wrap',
                }}
            >
                { }
                <img src={faviconFor(report.site.replace(/^https?:\/\//, ''))} alt="" width={16} height={16} />
                <strong style={{ fontWeight: 900, fontSize: '0.85rem', letterSpacing: '-0.01em' }}>{report.name}</strong>
                <span style={{ fontFamily: 'monospace', fontSize: '0.58rem', fontWeight: 800, color: badge.color, letterSpacing: '0.06em' }}>
                    {badge.label}
                </span>
                <span style={{ marginLeft: 'auto' }}>
                    <a
                        href={report.searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '0.58rem',
                            fontWeight: 800,
                            color: '#000',
                            letterSpacing: '0.05em',
                            textDecoration: 'underline',
                            textUnderlineOffset: 2,
                        }}
                    >
                        SITE SEARCH ↗
                    </a>
                </span>
            </div>

            {/* results */}
            {report.results.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {report.results.map((r) => {
                        let path = '';
                        try {
                            const u = new URL(r.url);
                            path = u.hostname.replace('www.', '') + (u.pathname === '/' ? '' : u.pathname);
                        } catch {
                            path = r.url;
                        }
                        return (
                            <a
                                key={r.url}
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '9px 12px',
                                    borderBottom: '1px solid #e5e5e5',
                                    textDecoration: 'none',
                                    color: '#000',
                                    background: 'transparent',
                                    transition: 'background 0.1s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#FFFBEB')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                                <span style={{ minWidth: 0, flex: 1 }}>
                                    <span
                                        style={{
                                            display: 'block',
                                            fontWeight: 800,
                                            fontSize: '0.82rem',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {r.title}
                                    </span>
                                    <span
                                        style={{
                                            display: 'block',
                                            fontFamily: 'monospace',
                                            fontSize: '0.6rem',
                                            color: '#16a34a',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            marginTop: 1,
                                        }}
                                    >
                                        {path}
                                    </span>
                                    {r.snippet && (
                                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#666', marginTop: 2, lineHeight: 1.35 }}>
                                            {r.snippet}
                                        </span>
                                    )}
                                </span>
                                <ArrowUpRight size={15} strokeWidth={2.5} style={{ flexShrink: 0, color: '#000' }} />
                            </a>
                        );
                    })}
                </div>
            ) : (
                <div style={{ padding: '12px 12px 14px' }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#666', lineHeight: 1.4 }}>
                        {report.status === 'empty'
                            ? 'Nothing matched on this one from here — finish the job with its own search:'
                            : 'No live results for this one right now — jump straight to its search:'}
                    </p>
                </div>
            )}
        </div>
    );
}

// ─── Main explorer ────────────────────────────────────────────────────────────

export default function DirectoryExplorer() {
    const [input, setInput] = useState('');
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<DirectorySearchResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<'all' | 'liked' | DirectoryCategoryId>('all');
    const abortRef = useRef<AbortController | null>(null);

    const runSearch = useCallback((q: string) => {
        const trimmed = q.trim();
        if (trimmed.length < 2) return;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setInput(trimmed);
        setQuery(trimmed);
        setLoading(true);
        setError(null);
        fetch(`/api/component-search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
            .then(async (res) => {
                if (!res.ok) throw new Error(`Search failed (${res.status})`);
                return (await res.json()) as DirectorySearchResponse;
            })
            .then((body) => setData(body))
            .catch((err: unknown) => {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                setError(err instanceof Error ? err.message : 'Search failed');
                setData(null);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
    }, []);

    // clear the abort controller on unmount
    useEffect(() => () => abortRef.current?.abort(), []);

    const clearSearch = () => {
        abortRef.current?.abort();
        setQuery('');
        setInput('');
        setData(null);
        setLoading(false);
        setError(null);
    };

    const counts = useMemo(() => {
        const byCat = new Map<DirectoryCategoryId, number>();
        for (const s of COMPONENT_SITES) byCat.set(s.category, (byCat.get(s.category) ?? 0) + 1);
        return byCat;
    }, []);

    const { likes, liked, toggle } = useSiteLikes();

    // Owner ruling 2026-11-06: liked sites float to the top in liking order
    // (newest like first — re-like to re-promote); everything else keeps the
    // default featured-first order underneath. The LIKED filter shows only
    // the likes, top-to-bottom, exactly in the owner's chosen order.
    const visibleSites = useMemo(() => {
        const rank = new Map(likes.map((slug, i) => [slug, i] as const));
        const pool =
            activeCategory === 'all' || activeCategory === 'liked'
                ? ORDERED_SITES
                : ORDERED_SITES.filter((s) => s.category === activeCategory);
        const likedSites = pool
            .filter((s) => rank.has(s.slug))
            .sort((a, b) => (rank.get(a.slug) ?? 0) - (rank.get(b.slug) ?? 0));
        if (activeCategory === 'liked') return likedSites;
        return [...likedSites, ...pool.filter((s) => !rank.has(s.slug))];
    }, [activeCategory, likes]);

    // Live "shelf" search over the directory's own text (owner ruling
    // 2026-11-10): matches the entries' names, taglines, descriptions, tags,
    // stack and detail-page bullets as you type, grouped by category. Enter
    // then layers the federated web sweep on top for the same query.
    const shelfMatches = useMemo(() => matchShelfSites(input), [input]);
    const shelfGroups = useMemo(() => groupSitesByCategory(shelfMatches), [shelfMatches]);
    const shelfFilterActive = !query && input.trim().length >= 2;

    const queryShelfMatches = useMemo(() => matchShelfSites(query), [query]);
    const queryShelfGroups = useMemo(() => groupSitesByCategory(queryShelfMatches), [queryShelfMatches]);

    const totalFound = data?.sources.reduce((n, s) => n + (s.status === 'ok' ? s.results.length : 0), 0) ?? 0;
    const liveSources = data?.sources.filter((s) => s.status !== 'skipped') ?? [];

    return (
        <div
            style={{
                padding: 'clamp(16px, 3vw, 32px) clamp(12px, 3vw, 24px) 80px',
                maxWidth: 1200,
                margin: '0 auto',
            }}
        >
            {/* ── Header ── */}
            <header style={{ marginBottom: 20 }}>
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#FFE500',
                        border: '2px solid #000',
                        borderRadius: 5,
                        boxShadow: '2px 2px 0 #000',
                        padding: '4px 10px',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.62rem',
                        letterSpacing: '0.1em',
                        marginBottom: 12,
                    }}
                >
                    <Sparkles size={12} strokeWidth={2.75} /> PERSONAL ARMORY · {COMPONENT_SITES.length} SITES ·{' '}
                    {DIRECTORY_CATEGORIES.length} CATEGORIES
                </div>
                <h1 style={{ fontSize: 'clamp(1.7rem, 4.5vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, margin: '0 0 8px' }}>
                    UI Component Directory
                </h1>
                <p style={{ fontSize: '0.92rem', color: '#444', lineHeight: 1.55, maxWidth: 640, margin: 0, fontWeight: 500 }}>
                    Every place worth stealing UI from, in one permanent shelf — search them all at once, open what you
                    need, never build a component from scratch again.
                </p>
            </header>

            {/* ── Federated search bar ── */}
            <div
                style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'stretch',
                    marginBottom: 10,
                }}
            >
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: '#fff',
                        border: '3px solid #000',
                        borderRadius: 10,
                        boxShadow: '4px 4px 0 #000',
                        padding: '0 12px',
                        minWidth: 0,
                    }}
                >
                    <Search size={18} strokeWidth={2.75} style={{ flexShrink: 0 }} />
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') runSearch(input);
                        }}
                        placeholder="type to search this shelf's descriptions — Enter sweeps the whole web"
                        aria-label="Search all component libraries"
                        style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            padding: '13px 0',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            background: 'transparent',
                            minWidth: 0,
                            fontFamily: 'inherit',
                        }}
                    />
                    {input && (
                        <button
                            onClick={() => {
                                setInput('');
                            }}
                            aria-label="Clear query"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#666' }}
                        >
                            <X size={16} strokeWidth={2.75} />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => runSearch(input)}
                    disabled={loading || input.trim().length < 2}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '0 22px',
                        background: input.trim().length < 2 ? '#e5e5e5' : '#FFE500',
                        color: '#000',
                        border: '3px solid #000',
                        borderRadius: 10,
                        boxShadow: '4px 4px 0 #000',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        cursor: input.trim().length < 2 ? 'not-allowed' : 'pointer',
                    }}
                >
                    {loading ? <Loader2 size={16} className="animate-spin" strokeWidth={2.75} /> : <Search size={16} strokeWidth={2.75} />}
                    <span style={{ display: 'none' }}>Run</span>
                    {loading ? 'Searching…' : 'Search'}
                </button>
            </div>

            {/* example chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22 }}>
                {EXAMPLE_QUERIES.map((q) => (
                    <button
                        key={q}
                        onClick={() => runSearch(q)}
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            color: '#000',
                            background: '#fff',
                            border: '2px solid #000',
                            borderRadius: 999,
                            padding: '4px 10px',
                            cursor: 'pointer',
                        }}
                    >
                        {q}
                    </button>
                ))}
            </div>

            {/* ── Results mode ── */}
            {query && (
                <section style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                        <button
                            onClick={clearSearch}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontFamily: 'monospace',
                                fontSize: '0.66rem',
                                fontWeight: 900,
                                letterSpacing: '0.05em',
                                background: '#fff',
                                border: '2px solid #000',
                                borderRadius: 6,
                                boxShadow: '2px 2px 0 #000',
                                padding: '6px 10px',
                                cursor: 'pointer',
                            }}
                        >
                            <ArrowLeft size={13} strokeWidth={2.75} /> ALL SITES
                        </button>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 800, color: '#dc2626', letterSpacing: '0.04em' }}>
                            “{query}”
                        </span>
                        {!loading && data && (
                            <span style={{ fontFamily: 'monospace', fontSize: '0.62rem', fontWeight: 700, color: '#666' }}>
                                {totalFound} RESULTS · {liveSources.length} LIBRARIES · {data.tookMs}MS
                            </span>
                        )}
                    </div>

                    {queryShelfGroups.length > 0 && (
                        <div style={{ background: '#fff', border: '3px solid #000', borderRadius: 10, boxShadow: '4px 4px 0 #000', padding: 16, marginBottom: 14 }}>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.66rem', fontWeight: 900, color: '#dc2626', letterSpacing: '0.06em', marginBottom: 12 }}>
                                FROM YOUR SHELF · {queryShelfMatches.length} CATEGORIZED MATCH{queryShelfMatches.length === 1 ? '' : 'ES'}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                                {queryShelfGroups.map((g) => (
                                    <div key={g.id}>
                                        <div style={{ fontFamily: 'monospace', fontSize: '0.58rem', fontWeight: 800, color: '#888', letterSpacing: '0.08em', marginBottom: 6 }}>
                                            {g.label} ({g.sites.length})
                                        </div>
                                        {g.sites.map((site) => (
                                            <Link
                                                key={site.slug}
                                                href={`/components/${site.slug}`}
                                                title={site.tagline}
                                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 0', fontWeight: 800, fontSize: '0.78rem', color: '#000', textDecoration: 'none' }}
                                                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                            >
                                                {site.name}
                                                <ArrowUpRight size={11} strokeWidth={2.5} style={{ flexShrink: 0, color: '#666' }} />
                                            </Link>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div style={{ background: '#fff', border: '3px solid #dc2626', borderRadius: 10, padding: 14, fontWeight: 700, color: '#dc2626', marginBottom: 14 }}>
                            {error} — try again, or use the site search links below.
                        </div>
                    )}

                    {loading ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="animate-pulse"
                                    style={{ background: '#fff', border: '3px solid #000', borderRadius: 10, boxShadow: '4px 4px 0 #000', padding: 14, minHeight: 90 }}
                                />
                            ))}
                        </div>
                    ) : (
                        data && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, alignItems: 'start' }}>
                                {data.sources.map((report) => (
                                    <SourceReportCard key={report.slug} report={report} />
                                ))}
                            </div>
                        )
                    )}
                </section>
            )}

            {/* ── Live shelf search: descriptions on the shelf, grouped by category ── */}
            {!query && shelfFilterActive && (
                <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: 900, color: '#dc2626', letterSpacing: '0.06em' }}>
                            SHELF MATCHES · “{input.trim()}” · {shelfMatches.length} SITE{shelfMatches.length === 1 ? '' : 'S'}
                        </span>
                        <button
                            onClick={() => setInput('')}
                            aria-label="Clear shelf filter"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontFamily: 'monospace',
                                fontSize: '0.6rem',
                                fontWeight: 900,
                                letterSpacing: '0.05em',
                                background: '#fff',
                                border: '2px solid #000',
                                borderRadius: 6,
                                boxShadow: '2px 2px 0 #000',
                                padding: '4px 8px',
                                cursor: 'pointer',
                            }}
                        >
                            <X size={12} strokeWidth={2.75} /> CLEAR
                        </button>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.6rem', fontWeight: 700, color: '#666', letterSpacing: '0.04em' }}>
                            ENTER = ALSO SWEEP THE WEB
                        </span>
                    </div>

                    {shelfGroups.length > 0 ? (
                        shelfGroups.map((g) => (
                            <CategorySection key={g.id} label={g.label} count={g.sites.length}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
                                    {g.sites.map((site) => (
                                        <SiteCard
                                            key={site.slug}
                                            site={site}
                                            liked={liked(site.slug)}
                                            onToggleLike={() => toggle(site.slug)}
                                        />
                                    ))}
                                </div>
                            </CategorySection>
                        ))
                    ) : (
                        <p style={{ fontSize: '0.85rem', color: '#555', margin: '0 0 14px', fontWeight: 500, maxWidth: 640 }}>
                            Nothing on your shelf matches that — press Enter (or hit Search) to sweep every listed
                            library's own site on the web instead.
                        </p>
                    )}
                </section>
            )}

            {/* ── Browse mode: category chips + grid ── */}
            {!query && !shelfFilterActive && (
                <section>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                        <button
                            onClick={() => setActiveCategory('all')}
                            style={{
                                fontFamily: 'monospace',
                                fontSize: '0.62rem',
                                fontWeight: 900,
                                letterSpacing: '0.06em',
                                background: activeCategory === 'all' ? '#FFE500' : '#fff',
                                border: '2px solid #000',
                                borderRadius: 999,
                                padding: '5px 12px',
                                cursor: 'pointer',
                                boxShadow: activeCategory === 'all' ? '2px 2px 0 #000' : 'none',
                            }}
                        >
                            ALL ({COMPONENT_SITES.length})
                        </button>
                        <button
                            onClick={() => setActiveCategory('liked')}
                            style={{
                                fontFamily: 'monospace',
                                fontSize: '0.62rem',
                                fontWeight: 900,
                                letterSpacing: '0.06em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                color: likes.length > 0 ? '#dc2626' : '#000',
                                background: activeCategory === 'liked' ? '#FFE500' : '#fff',
                                border: '2px solid #000',
                                borderRadius: 999,
                                padding: '5px 12px',
                                cursor: 'pointer',
                                boxShadow: activeCategory === 'liked' ? '2px 2px 0 #000' : 'none',
                            }}
                        >
                            <Heart size={11} strokeWidth={2.75} fill={likes.length > 0 ? '#dc2626' : 'none'} />
                            LIKED ({likes.length})
                        </button>
                        {DIRECTORY_CATEGORIES.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setActiveCategory(c.id)}
                                style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.62rem',
                                    fontWeight: 900,
                                    letterSpacing: '0.06em',
                                    background: activeCategory === c.id ? '#FFE500' : '#fff',
                                    border: '2px solid #000',
                                    borderRadius: 999,
                                    padding: '5px 12px',
                                    cursor: 'pointer',
                                    boxShadow: activeCategory === c.id ? '2px 2px 0 #000' : 'none',
                                }}
                            >
                                {c.label} ({counts.get(c.id) ?? 0})
                            </button>
                        ))}
                    </div>

                    {activeCategory !== 'all' && activeCategory !== 'liked' && (
                        <p style={{ fontSize: '0.85rem', color: '#555', margin: '0 0 14px', fontWeight: 500, maxWidth: 640 }}>
                            {categoryById(activeCategory).blurb}
                        </p>
                    )}

                    {activeCategory === 'liked' && visibleSites.length === 0 && (
                        <p style={{ fontSize: '0.85rem', color: '#555', margin: '0 0 14px', fontWeight: 500, maxWidth: 640 }}>
                            Nothing hearted yet — tap the heart on any card below. Liked sites rise to the top of the
                            directory, newest like first, so re-liking a site moves it back to pole position.
                        </p>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
                        {visibleSites.map((site) => (
                            <SiteCard
                                key={site.slug}
                                site={site}
                                liked={liked(site.slug)}
                                onToggleLike={() => toggle(site.slug)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ── Footer note: how this grows ── */}
            <footer
                style={{
                    marginTop: 36,
                    background: '#fff',
                    border: '2px dashed #000',
                    borderRadius: 10,
                    padding: '14px 16px',
                    fontFamily: 'monospace',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: '#444',
                    lineHeight: 1.6,
                }}
            >
                FOUND A NEW SITE? → it goes in{' '}
                <span style={{ color: '#dc2626' }}>src/data/component-directory.ts</span> (one entry: name, category,
                search strategy) — the hub grid, detail pages, sitemap and federated search pick it up automatically.
                Deep links: {COMPONENT_SITES.slice(0, 3).map((s) => resolveSearchUrl(s, 'x').replace(/\/$/, '')).join(' · ')} …
            </footer>
        </div>
    );
}
