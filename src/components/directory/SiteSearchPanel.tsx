'use client';

/**
 * SiteSearchPanel — the live search box on every /components/[slug] detail
 * page. Queries /api/component-search scoped to ONE source (?source=slug) and
 * renders that site's real component pages inline, with the site's own search
 * page as the guaranteed deep-link fallback.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Loader2, Search } from 'lucide-react';
import { resolveSearchUrl, type ComponentSite } from '@/data/component-directory';
import type { DirectorySearchResponse } from '@/app/api/component-search/route';

interface SiteSearchPanelProps {
    site: ComponentSite;
}

export default function SiteSearchPanel({ site }: SiteSearchPanelProps) {
    const [input, setInput] = useState('');
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<DirectorySearchResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => () => abortRef.current?.abort(), []);

    const run = useCallback(
        (q: string) => {
            const trimmed = q.trim();
            if (trimmed.length < 2) return;
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            setQuery(trimmed);
            setLoading(true);
            setError(null);
            fetch(`/api/component-search?q=${encodeURIComponent(trimmed)}&source=${encodeURIComponent(site.slug)}`, {
                signal: controller.signal,
            })
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
        },
        [site.slug],
    );

    const report = data?.sources.find((s) => s.slug === site.slug);
    const deepUrl = query ? resolveSearchUrl(site, query) : site.searchUrl;

    return (
        <section
            style={{
                background: '#fff',
                border: '3px solid #000',
                borderRadius: 10,
                boxShadow: '5px 5px 0 #000',
                padding: 16,
            }}
        >
            <div
                style={{
                    fontFamily: 'monospace',
                    fontSize: '0.62rem',
                    fontWeight: 900,
                    letterSpacing: '0.1em',
                    color: '#dc2626',
                    marginBottom: 10,
                }}
            >
                SEARCH THIS LIBRARY FROM HERE
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        border: '2.5px solid #000',
                        borderRadius: 8,
                        padding: '0 10px',
                        background: '#FAFAFA',
                        minWidth: 0,
                    }}
                >
                    <Search size={16} strokeWidth={2.75} style={{ flexShrink: 0 }} />
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') run(input);
                        }}
                        placeholder={`try “button”, “toggle”, “hero”…`}
                        aria-label={`Search ${site.name}`}
                        style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            padding: '11px 0',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            background: 'transparent',
                            minWidth: 0,
                            fontFamily: 'inherit',
                        }}
                    />
                </div>
                <button
                    onClick={() => run(input)}
                    disabled={loading || input.trim().length < 2}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '0 16px',
                        background: input.trim().length < 2 ? '#e5e5e5' : '#FFE500',
                        border: '2.5px solid #000',
                        borderRadius: 8,
                        boxShadow: '2.5px 2.5px 0 #000',
                        fontWeight: 900,
                        fontSize: '0.72rem',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: input.trim().length < 2 ? 'not-allowed' : 'pointer',
                    }}
                >
                    {loading ? <Loader2 size={14} className="animate-spin" strokeWidth={2.75} /> : null}
                    {loading ? '…' : 'Go'}
                </button>
            </div>

            {/* results */}
            {error && (
                <p style={{ margin: '10px 0 0', fontSize: '0.8rem', color: '#dc2626', fontWeight: 700 }}>
                    {error} — use the direct link below.
                </p>
            )}

            {loading && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="animate-pulse" style={{ height: 42, background: '#f0f0f0', borderRadius: 6 }} />
                    ))}
                </div>
            )}

            {!loading && report && (
                <div style={{ marginTop: 12 }}>
                    {report.results.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {report.results.map((r) => (
                                <a
                                    key={r.url}
                                    href={r.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '9px 10px',
                                        border: '2px solid #000',
                                        borderRadius: 7,
                                        textDecoration: 'none',
                                        color: '#000',
                                        background: '#fff',
                                    }}
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
                                        <span style={{ display: 'block', fontFamily: 'monospace', fontSize: '0.58rem', color: '#16a34a', marginTop: 1 }}>
                                            {(() => {
                                                try {
                                                    const u = new URL(r.url);
                                                    return u.hostname.replace('www.', '') + u.pathname;
                                                } catch {
                                                    return r.url;
                                                }
                                            })()}
                                        </span>
                                    </span>
                                    <ArrowUpRight size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                                </a>
                            ))}
                        </div>
                    ) : (
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#666', fontWeight: 600, lineHeight: 1.45 }}>
                            {report.status === 'empty'
                                ? `No “${query}” match found from here — run it on ${site.name} directly:`
                                : `This one doesn't allow live lookups from here — search it on the site directly:`}
                        </p>
                    )}
                </div>
            )}

            {/* guaranteed deep link */}
            <a
                href={deepUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 12,
                    fontFamily: 'monospace',
                    fontSize: '0.66rem',
                    fontWeight: 900,
                    letterSpacing: '0.05em',
                    color: '#000',
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                }}
            >
                {query ? `RUN “${query.toUpperCase()}” ON ${site.name.toUpperCase()} ↗` : `OPEN ${site.name.toUpperCase()} SEARCH ↗`}
            </a>
        </section>
    );
}
