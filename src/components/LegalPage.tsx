/**
 * src/components/LegalPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared brutalist renderer for the legal pages (/privacy, /terms).
 *
 * Server component — no client JS. Content sections are supplied by each
 * page as plain data ({ title, items: [{ label, text }] }) so the words
 * stay reviewable in one place and the look stays monochrome house style
 * (black/white, monospace badges, 2px rules — same vocabulary as
 * /your-data and the tool pages).
 */

import Link from 'next/link';

export type LegalSection = {
    id: string;
    title: string;
    items: { label: string; text: string }[];
};

export type LegalPageProps = {
    badge: string;
    title: string;
    updated: string;
    /** Rendered inside the top summary card ("the short version"). */
    intro: string;
    sections: LegalSection[];
    /** Which sibling page to cross-link first in the footer row. */
    sibling: { href: string; label: string };
};

export default function LegalPage({ badge, title, updated, intro, sections, sibling }: LegalPageProps) {
    return (
        <div style={{ background: '#f4f4f5', minHeight: '100vh', padding: 'clamp(32px, 6vw, 64px) clamp(16px, 5vw, 24px) 80px' }}>
            <div style={{ maxWidth: 780, margin: '0 auto' }}>
                {/* Badge row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 900, padding: '3px 8px', border: '2px solid #000', background: '#000', color: '#fff', fontFamily: 'monospace' }}>
                        {badge}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', letterSpacing: '0.06em' }}>
                        LAST UPDATED · {updated}
                    </span>
                </div>

                {/* Title */}
                <h1 style={{ fontSize: 'clamp(1.7rem, 5vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 22px', textTransform: 'uppercase', color: '#000', lineHeight: 1.1 }}>
                    {title}
                </h1>

                {/* The short version */}
                <div className="brutalist-card" style={{ padding: 18, marginBottom: 36 }}>
                    <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, color: '#666', letterSpacing: '0.1em', marginBottom: 8 }}>
                        THE SHORT VERSION
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#000', lineHeight: 1.7, fontWeight: 500 }}>{intro}</div>
                </div>

                {/* Sections */}
                {sections.map((section, sIdx) => (
                    <section key={section.id} style={{ marginBottom: 40 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
                            <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 900, color: '#000' }}>
                                {section.id}
                            </span>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0, color: '#000' }}>
                                {section.title}
                            </h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {section.items.map((item) => (
                                <div key={item.label}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#000', marginBottom: 4 }}>
                                        {item.label}
                                    </div>
                                    <div style={{ fontSize: '0.86rem', color: '#444', lineHeight: 1.7, fontWeight: 500 }}>{item.text}</div>
                                </div>
                            ))}
                        </div>
                        {sIdx < sections.length - 1 && <div style={{ height: 2, background: '#000', marginTop: 36 }} />}
                    </section>
                ))}

                {/* Cross-links */}
                <div style={{ height: 2, background: '#000', marginBottom: 24 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    <Link href={sibling.href} style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', textDecoration: 'none', borderBottom: '2px solid #000', paddingBottom: 2 }}>
                        {sibling.label} →
                    </Link>
                    <Link href="/your-data" style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', textDecoration: 'none', borderBottom: '2px solid #000', paddingBottom: 2 }}>
                        YOUR DATA — VIEW / DELETE / EXPORT →
                    </Link>
                    <Link href="/" style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 900, color: '#000', textDecoration: 'none', borderBottom: '2px solid #000', paddingBottom: 2 }}>
                        ALL TOOLS →
                    </Link>
                </div>
                <div style={{ marginTop: 28, fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 800, color: '#666' }}>
                    CREATORSKIT · CREATORSKIT.WIN · © 2026
                </div>
            </div>
        </div>
    );
}
