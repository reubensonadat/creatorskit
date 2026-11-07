import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, CheckCircle2, TerminalSquare } from 'lucide-react';
import {
    COMPONENT_SITES,
    categoryById,
    faviconFor,
    getSiteBySlug,
    type ComponentSite,
} from '@/data/component-directory';
import SiteLikeButton from '@/components/directory/SiteLikeButton';
import SiteSearchPanel from '@/components/directory/SiteSearchPanel';
import { SITE_BASE_URL } from '@/lib/seo';

/**
 * /components/[slug] — a dedicated page for every site in the directory,
 * statically generated from the dataset (Next 16: params is a Promise).
 */

export const dynamicParams = false;

export function generateStaticParams() {
    return COMPONENT_SITES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const site = getSiteBySlug(slug);
    if (!site) return { title: 'Site not found — CreatorsKit' };
    return {
        title: `${site.name} — UI Component Directory | CreatorsKit`,
        description: site.tagline,
        alternates: { canonical: `/components/${site.slug}` },
        openGraph: {
            title: `${site.name} — UI Component Directory`,
            description: site.tagline,
            url: `${SITE_BASE_URL}/components/${site.slug}`,
            type: 'website',
        },
    };
}

// ─── Small building blocks (server-safe) ─────────────────────────────────────

function MetaCell({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ border: '2px solid #000', borderRadius: 8, padding: '10px 12px', background: '#FAFAFA', minWidth: 0 }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.56rem', fontWeight: 900, letterSpacing: '0.1em', color: '#dc2626', marginBottom: 4 }}>
                {label}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#000', wordBreak: 'break-word', lineHeight: 1.35 }}>{value}</div>
        </div>
    );
}

function RelatedCard({ site }: { site: ComponentSite }) {
    return (
        <Link
            href={`/components/${site.slug}`}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '10px 12px',
                background: '#fff',
                border: '2.5px solid #000',
                borderRadius: 8,
                boxShadow: '3px 3px 0 #000',
                textDecoration: 'none',
                color: '#000',
            }}
        >
            { }
            <img src={faviconFor(site.domain)} alt="" width={18} height={18} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 900, fontSize: '0.82rem', minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {site.name}
            </span>
            <ArrowUpRight size={13} strokeWidth={2.5} style={{ flexShrink: 0, color: '#666' }} />
        </Link>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SiteDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const site = getSiteBySlug(slug);
    if (!site) notFound();

    const cat = categoryById(site.category);
    const related = COMPONENT_SITES.filter((s) => s.category === site.category && s.slug !== site.slug).slice(0, 6);

    return (
        <div style={{ padding: 'clamp(16px, 3vw, 32px) clamp(12px, 3vw, 24px) 80px', maxWidth: 900, margin: '0 auto' }}>
            {/* breadcrumbs */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.68rem',
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    color: '#666',
                    marginBottom: 16,
                    flexWrap: 'wrap',
                }}
            >
                <Link href="/components" style={{ color: '#000', textDecoration: 'none' }}>
                    DIRECTORY
                </Link>
                <span>{'>'}</span>
                <span style={{ color: '#dc2626' }}>{cat.label}</span>
                <span>{'>'}</span>
                <span style={{ color: '#000' }}>{site.name.toUpperCase()}</span>
            </div>

            {/* header */}
            <header style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
                <span
                    style={{
                        width: 64,
                        height: 64,
                        flexShrink: 0,
                        border: '3px solid #000',
                        borderRadius: 12,
                        background: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        boxShadow: '4px 4px 0 #000',
                    }}
                >
                    { }
                    <img src={faviconFor(site.domain, 128)} alt="" width={36} height={36} />
                </span>
                <div style={{ flex: 1, minWidth: 220 }}>
                    <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.1, margin: 0 }}>
                        {site.name}
                    </h1>
                    <p style={{ margin: '6px 0 0', fontSize: '0.92rem', color: '#444', fontWeight: 600, lineHeight: 1.5, maxWidth: 560 }}>
                        {site.tagline}
                    </p>
                </div>
                <SiteLikeButton slug={site.slug} name={site.name} />
            </header>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 22px',
                        background: '#FFE500',
                        color: '#000',
                        border: '3px solid #000',
                        borderRadius: 8,
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textDecoration: 'none',
                        boxShadow: '4px 4px 0 #000',
                    }}
                >
                    Open {site.name} <ArrowUpRight size={15} strokeWidth={2.75} />
                </a>
                <Link
                    href="/components"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 18px',
                        background: '#fff',
                        color: '#000',
                        border: '3px solid #000',
                        borderRadius: 8,
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textDecoration: 'none',
                        boxShadow: '4px 4px 0 #000',
                    }}
                >
                    <ArrowLeft size={15} strokeWidth={2.75} /> All sites
                </Link>
            </div>

            {/* live search */}
            <SiteSearchPanel site={site} />

            {/* meta grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, margin: '20px 0' }}>
                <MetaCell label="STACK" value={site.stack.join(' · ')} />
                <MetaCell label="PRICING" value={site.pricing} />
                {site.license && <MetaCell label="LICENSE" value={site.license} />}
                <MetaCell
                    label="SEARCH STRATEGY"
                    value={
                        site.search.strategy === 'sitemap'
                            ? 'Live — direct from their sitemap'
                            : site.search.strategy === 'bing'
                                ? 'Live — web index (site is bot-walled)'
                                : 'Deep link only'
                    }
                />
            </div>

            {/* description */}
            <section style={{ background: '#fff', border: '3px solid #000', borderRadius: 10, boxShadow: '5px 5px 0 #000', padding: 'clamp(16px, 3vw, 26px)', marginBottom: 16 }}>
                <h2 style={{ fontFamily: 'monospace', fontSize: '0.66rem', fontWeight: 900, letterSpacing: '0.1em', color: '#dc2626', margin: '0 0 10px' }}>
                    WHAT IT IS
                </h2>
                <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.65, color: '#222', fontWeight: 500 }}>{site.description}</p>

                {site.install && (
                    <div style={{ marginTop: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: '0.56rem', fontWeight: 900, letterSpacing: '0.1em', color: '#dc2626', marginBottom: 6 }}>
                            <TerminalSquare size={12} strokeWidth={2.75} /> INSTALL / HOW TO TAKE IT
                        </div>
                        <code
                            style={{
                                display: 'block',
                                background: '#08080a',
                                color: '#FFE500',
                                border: '2px solid #000',
                                borderRadius: 8,
                                padding: '10px 12px',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                overflowX: 'auto',
                                whiteSpace: 'pre',
                            }}
                        >
                            {site.install}
                        </code>
                    </div>
                )}
            </section>

            {/* highlights + best for */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 16 }}>
                <section style={{ background: '#fff', border: '3px solid #000', borderRadius: 10, boxShadow: '5px 5px 0 #000', padding: 18 }}>
                    <h2 style={{ fontFamily: 'monospace', fontSize: '0.66rem', fontWeight: 900, letterSpacing: '0.1em', color: '#dc2626', margin: '0 0 12px' }}>
                        WHY IT EARNS A SLOT
                    </h2>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {site.highlights.map((h) => (
                            <li key={h} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.85rem', fontWeight: 600, color: '#222', lineHeight: 1.45 }}>
                                <CheckCircle2 size={15} strokeWidth={2.5} style={{ flexShrink: 0, color: '#16a34a', marginTop: 2 }} />
                                {h}
                            </li>
                        ))}
                    </ul>
                </section>

                <section style={{ background: '#fff', border: '3px solid #000', borderRadius: 10, boxShadow: '5px 5px 0 #000', padding: 18 }}>
                    <h2 style={{ fontFamily: 'monospace', fontSize: '0.66rem', fontWeight: 900, letterSpacing: '0.1em', color: '#dc2626', margin: '0 0 12px' }}>
                        REACH FOR IT WHEN YOU NEED
                    </h2>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {site.bestFor.map((b) => (
                            <span
                                key={b}
                                style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.64rem',
                                    fontWeight: 800,
                                    color: '#000',
                                    background: '#FFE500',
                                    border: '2px solid #000',
                                    borderRadius: 999,
                                    padding: '5px 11px',
                                }}
                            >
                                {b}
                            </span>
                        ))}
                    </div>
                    <p style={{ margin: '14px 0 0', fontFamily: 'monospace', fontSize: '0.6rem', fontWeight: 700, color: '#888', letterSpacing: '0.04em', lineHeight: 1.6 }}>
                        CATEGORY: {cat.label} — {cat.blurb}
                    </p>
                </section>
            </div>

            {/* related */}
            {related.length > 0 && (
                <section>
                    <h2 style={{ fontFamily: 'monospace', fontSize: '0.66rem', fontWeight: 900, letterSpacing: '0.1em', color: '#dc2626', margin: '0 0 10px' }}>
                        MORE IN {cat.label}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                        {related.map((r) => (
                            <RelatedCard key={r.slug} site={r} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
