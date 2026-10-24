/**
 * src/components/ToolArticle.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The editorial layer rendered below every embedded tool (AdSense "low value
 * content" remediation 2026-10-23). Renders the unique per-tool guide, use
 * cases and FAQ from src/data/tool-content.ts in the site's neobrutalist
 * style, and emits HowTo + FAQPage JSON-LD so search engines see the same
 * substance reviewers do.
 *
 * Plain (non-client) component: no hooks, no browser APIs — safe to render
 * from the client ToolLayout and still fully server-rendered in the HTML.
 */

import Link from "next/link";
import { contentForTool } from "@/data/tool-content";
import { SITE_BASE_URL } from "@/lib/seo";

export default function ToolArticle({ pathname }: { pathname: string | null }) {
    const content = contentForTool(pathname);
    if (!content) return null;

    const pageUrl = `${SITE_BASE_URL}${pathname}`;

    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "HowTo",
                name: `How to use ${content.heading.replace(/^About (the )?/, "")}`,
                description: content.intro[0],
                totalTime: "PT2M",
                step: content.steps.map((s, i) => ({
                    "@type": "HowToStep",
                    position: i + 1,
                    name: s.title,
                    text: s.detail,
                })),
            },
            {
                "@type": "FAQPage",
                mainEntity: content.faqs.map((f) => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
            },
            {
                "@type": "WebPage",
                url: pageUrl,
                name: content.heading,
                description: content.intro[0].slice(0, 300),
                isPartOf: { "@type": "WebSite", name: "CreatorsKit", url: SITE_BASE_URL },
            },
        ],
    };

    return (
        <article
            data-tool-article={pathname ?? undefined}
            style={{
                maxWidth: 860,
                margin: "40px auto 0",
                padding: "0 20px 72px",
                fontFamily:
                    'Raleway, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
            }}
        >
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* ── Article opener ─────────────────────────────────────────────── */}
            <header style={{ borderTop: "3px solid #000", paddingTop: 22 }}>
                <div
                    style={{
                        display: "inline-block",
                        fontSize: "0.62rem",
                        fontWeight: 900,
                        fontFamily: "monospace",
                        letterSpacing: "0.14em",
                        background: "#FFE500",
                        border: "2px solid #000",
                        boxShadow: "2px 2px 0 #000",
                        padding: "3px 10px",
                        marginBottom: 14,
                    }}
                >
                    GUIDE
                </div>
                <h2
                    style={{
                        fontSize: "clamp(1.35rem, 3.6vw, 1.9rem)",
                        fontWeight: 900,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.15,
                        margin: "0 0 14px",
                    }}
                >
                    {content.heading}
                </h2>
                {content.intro.map((p, i) => (
                    <p
                        key={i}
                        style={{
                            fontSize: "0.94rem",
                            lineHeight: 1.7,
                            color: "#333",
                            margin: "0 0 14px",
                        }}
                    >
                        {p}
                    </p>
                ))}
            </header>

            {/* ── How to use ─────────────────────────────────────────────────── */}
            <section style={{ marginTop: 36 }}>
                <SectionTitle index="01" title="How to use it" />
                <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
                    {content.steps.map((s, i) => (
                        <li
                            key={i}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "44px 1fr",
                                gap: 14,
                                alignItems: "start",
                                background: "#fff",
                                border: "2px solid #000",
                                boxShadow: "3px 3px 0 #000",
                                padding: "14px 16px",
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "1.05rem",
                                    fontWeight: 900,
                                    fontFamily: "monospace",
                                    background: "#000",
                                    color: "#FFE500",
                                    width: 34,
                                    height: 34,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                                aria-hidden
                            >
                                {i + 1}
                            </span>
                            <div>
                                <h3
                                    style={{
                                        fontSize: "0.98rem",
                                        fontWeight: 900,
                                        letterSpacing: "-0.01em",
                                        margin: "2px 0 6px",
                                    }}
                                >
                                    {s.title}
                                </h3>
                                <p style={{ fontSize: "0.88rem", lineHeight: 1.65, color: "#444", margin: 0 }}>
                                    {s.detail}
                                </p>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>

            {/* ── Use cases ──────────────────────────────────────────────────── */}
            <section style={{ marginTop: 36 }}>
                <SectionTitle index="02" title="What people use it for" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                    {content.useCases.map((u, i) => (
                        <div
                            key={i}
                            style={{
                                background: "#fff",
                                border: "2px solid #000",
                                boxShadow: "3px 3px 0 #000",
                                padding: "14px 16px",
                            }}
                        >
                            <h3 style={{ fontSize: "0.92rem", fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
                                {u.title}
                            </h3>
                            <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "#444", margin: 0 }}>{u.detail}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FAQ ────────────────────────────────────────────────────────── */}
            <section style={{ marginTop: 36 }}>
                <SectionTitle index="03" title="Frequently asked questions" />
                <div style={{ display: "grid", gap: 0, border: "2px solid #000", background: "#fff", boxShadow: "3px 3px 0 #000" }}>
                    {content.faqs.map((f, i) => (
                        <details key={i} open={i === 0} style={{ borderTop: i === 0 ? "none" : "2px solid #e4e4e7" }}>
                            <summary
                                style={{
                                    cursor: "pointer",
                                    padding: "13px 16px",
                                    fontSize: "0.93rem",
                                    fontWeight: 900,
                                    letterSpacing: "-0.01em",
                                    listStyle: "none",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 12,
                                }}
                            >
                                {f.q}
                                <span
                                    aria-hidden
                                    style={{
                                        fontFamily: "monospace",
                                        fontWeight: 900,
                                        fontSize: "1rem",
                                        color: "#000",
                                        flexShrink: 0,
                                    }}
                                >
                                    +
                                </span>
                            </summary>
                            <p
                                style={{
                                    padding: "0 16px 15px",
                                    fontSize: "0.88rem",
                                    lineHeight: 1.7,
                                    color: "#444",
                                    margin: 0,
                                }}
                            >
                                {f.a}
                            </p>
                        </details>
                    ))}
                </div>
            </section>

            {/* ── Related tools ──────────────────────────────────────────────── */}
            <section style={{ marginTop: 36 }}>
                <SectionTitle index="04" title="Works well with" />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {content.related.map((r) => (
                        <Link
                            key={r.href}
                            href={r.href}
                            style={{
                                display: "inline-flex",
                                flexDirection: "column",
                                gap: 2,
                                background: "#fff",
                                border: "2px solid #000",
                                boxShadow: "3px 3px 0 #000",
                                padding: "10px 16px",
                                textDecoration: "none",
                                color: "#000",
                            }}
                        >
                            <span style={{ fontSize: "0.88rem", fontWeight: 900, letterSpacing: "-0.01em" }}>{r.label}</span>
                            <span style={{ fontSize: "0.7rem", fontFamily: "monospace", fontWeight: 700, color: "#666" }}>{r.note}</span>
                        </Link>
                    ))}
                    <Link
                        href="/blog"
                        style={{
                            display: "inline-flex",
                            flexDirection: "column",
                            gap: 2,
                            background: "#FFE500",
                            border: "2px solid #000",
                            boxShadow: "3px 3px 0 #000",
                            padding: "10px 16px",
                            textDecoration: "none",
                            color: "#000",
                        }}
                    >
                        <span style={{ fontSize: "0.88rem", fontWeight: 900, letterSpacing: "-0.01em" }}>Creator guides</span>
                        <span style={{ fontSize: "0.7rem", fontFamily: "monospace", fontWeight: 700, color: "#444" }}>
                            Deep dives from the blog
                        </span>
                    </Link>
                </div>
            </section>
        </article>
    );
}

function SectionTitle({ index, title }: { index: string; title: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span
                style={{
                    fontSize: "0.66rem",
                    fontWeight: 900,
                    fontFamily: "monospace",
                    letterSpacing: "0.1em",
                    background: "#000",
                    color: "#fff",
                    padding: "2px 7px",
                }}
            >
                {index}
            </span>
            <h3
                style={{
                    fontSize: "1.05rem",
                    fontWeight: 900,
                    letterSpacing: "-0.01em",
                    margin: 0,
                    textTransform: "uppercase",
                }}
            >
                {title}
            </h3>
            <div style={{ flex: 1, height: 2, background: "#000", minWidth: 20 }} aria-hidden />
        </div>
    );
}
