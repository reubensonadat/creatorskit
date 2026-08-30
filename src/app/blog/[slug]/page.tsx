import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BLOG_POSTS, type BlogPost } from '@/data/blog-posts';
import { fetchPostBySlugFromDatabase, fetchPostsFromDatabase } from '@/lib/supabase';
import AdBanner from '@/components/AdBanner';
import NewsletterCard from '@/components/blog/NewsletterCard';
import SocialShareBar from '@/components/blog/SocialShareBar';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Film,
  Flame,
  Lightbulb,
  ListChecks,
  Quote,
  Sparkles,
  TrendingUp,
  Wrench,
  Youtube,
  Zap,
} from 'lucide-react';
import type { Metadata } from 'next';

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = (await fetchPostBySlugFromDatabase(slug)) || BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return { title: 'Post Not Found — CreatorKit' };

  return {
    title: `${post.title} — CreatorKit Research`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author.name],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = (await fetchPostBySlugFromDatabase(slug)) || BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  // Related posts
  const allPosts = (await fetchPostsFromDatabase()) || BLOG_POSTS;
  const otherPosts = allPosts.filter((p) => p.slug !== post.slug);

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', color: '#000000', padding: 'clamp(16px, 3vw, 36px) clamp(12px, 3vw, 24px) 100px' }}>
      {/* ── Top Leaderboard Monetization Ad ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto 20px' }}>
        <AdBanner slot="leaderboard" />
      </div>

      {/* ── 2-Column Layout Container: Article (Left) + Pure Vertical Ads (Right) ── */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 32,
          alignItems: 'start',
        }}
      >
        {/* ── LEFT COLUMN: MAIN ARTICLE CONTENT ── */}
        <main
          style={{
            gridColumn: 'span 2',
            minWidth: 0,
            background: '#ffffff',
            border: '3px solid #000000',
            boxShadow: '6px 6px 0 #000000',
            padding: 'clamp(20px, 4vw, 48px)',
            boxSizing: 'border-box',
          }}
        >
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 800, color: '#666', marginBottom: 16, flexWrap: 'wrap' }}>
            <Link href="/" style={{ color: '#000', textDecoration: 'none' }}>CREATORKIT</Link>
            <span>&gt;</span>
            <Link href="/blog" style={{ color: '#000', textDecoration: 'none' }}>RESEARCH</Link>
            <span>&gt;</span>
            <span style={{ color: '#dc2626' }}>{post.category.toUpperCase()}</span>
          </div>

          {/* Article Title */}
          <h1
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              fontWeight: 900,
              letterSpacing: '-0.035em',
              lineHeight: 1.15,
              color: '#000000',
              margin: '0 0 16px',
            }}
          >
            {post.title}
          </h1>

          {/* Byline with Author, Date & Read Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', fontFamily: 'monospace', color: '#52525b', marginBottom: 16, flexWrap: 'wrap' }}>
            <span>By <strong style={{ color: '#000' }}>{post.author.name}</strong></span>
            <span>·</span>
            <span>{post.date}</span>
            <span>·</span>
            <span>{post.readTime}</span>
          </div>

          {/* Social Share Bar */}
          <SocialShareBar title={post.title} slug={post.slug} />

          {/* Clean Hero Editorial Banner */}
          <div
            style={{
              background: '#000000',
              border: '2.5px solid #000000',
              boxShadow: '4px 4px 0 #000000',
              marginBottom: 32,
              overflow: 'hidden',
              maxHeight: 400,
            }}
          >
            <img
              src={post.coverImage || `https://img.youtube.com/vi/${post.youtubeId}/maxresdefault.jpg`}
              alt={post.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>

          {/* Subheading / Intro Hook */}
          <section style={{ marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 'clamp(1.2rem, 2.5vw, 1.45rem)',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: '#000000',
                margin: '0 0 12px',
              }}
            >
              Why Understanding This Changes Your Channel
            </h2>
            <p style={{ fontSize: '1rem', lineHeight: 1.7, color: '#27272a', margin: 0, fontWeight: 500 }}>
              {post.excerpt}
            </p>
          </section>

          {/* "What You'll Learn:" Section */}
          {post.content.whatYoullLearn && post.content.whatYoullLearn.length > 0 && (
            <section
              style={{
                marginBottom: 40,
                background: '#ffffff',
                border: '2.5px solid #000000',
                boxShadow: '4px 4px 0 #FFE500',
                padding: 'clamp(18px, 3vw, 24px)',
              }}
            >
              <h3
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  letterSpacing: '-0.01em',
                  color: '#000000',
                  textTransform: 'uppercase',
                  margin: '0 0 14px',
                }}
              >
                What You&apos;ll Learn:
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {post.content.whatYoullLearn.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span
                      style={{
                        background: '#000000',
                        color: '#FFE500',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.72rem',
                        padding: '2px 6px',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      0{idx + 1}
                    </span>
                    <span style={{ fontSize: '0.94rem', lineHeight: 1.55, color: '#18181b', fontWeight: 600 }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Main Structured Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {post.content.sections.map((section, sIdx) => (
              <React.Fragment key={section.id}>
                <section id={section.id}>
                  <h2
                    style={{
                      fontSize: 'clamp(1.25rem, 2.5vw, 1.6rem)',
                      fontWeight: 900,
                      letterSpacing: '-0.025em',
                      color: '#000000',
                      margin: '0 0 8px',
                    }}
                  >
                    {section.heading}
                  </h2>

                  {section.subheading && (
                    <p style={{ fontSize: '0.88rem', color: '#666', fontFamily: 'monospace', fontWeight: 700, margin: '0 0 14px' }}>
                      {section.subheading}
                    </p>
                  )}

                  {/* Paragraphs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {section.paragraphs.map((p, pIdx) => (
                      <p key={pIdx} style={{ fontSize: '0.98rem', lineHeight: 1.7, color: '#27272a', margin: 0, fontWeight: 500 }}>
                        {p}
                      </p>
                    ))}
                  </div>

                  {/* Quote Block (If any) */}
                  {section.quote && (
                    <div
                      style={{
                        margin: '22px 0',
                        background: '#fefce8',
                        border: '2px solid #000000',
                        borderLeft: '8px solid #FFE500',
                        boxShadow: '3px 3px 0 #000000',
                        padding: '16px 18px',
                      }}
                    >
                      <Quote size={18} color="#000" style={{ marginBottom: 6 }} />
                      <p style={{ margin: '0 0 6px', fontSize: '0.95rem', fontWeight: 700, color: '#713f12', lineHeight: 1.5, fontStyle: 'italic' }}>
                        &ldquo;{section.quote.text}&rdquo;
                      </p>
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, fontFamily: 'monospace', color: '#000', textTransform: 'uppercase' }}>
                        — {section.quote.speaker}
                      </span>
                    </div>
                  )}

                  {/* Table (If any) */}
                  {section.table && (
                    <div style={{ margin: '22px 0', overflowX: 'auto' }}>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          border: '2px solid #000000',
                          fontSize: '0.84rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        <thead>
                          <tr style={{ background: '#000000', color: '#FFE500' }}>
                            {section.table.headers.map((h, hIdx) => (
                              <th key={hIdx} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 900 }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {section.table.rows.map((row, rIdx) => (
                            <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? '#ffffff' : '#f9fafb', borderBottom: '1px solid #000000' }}>
                              {row.map((cell, cIdx) => (
                                <td
                                  key={cIdx}
                                  style={{
                                    padding: '10px 14px',
                                    color: cIdx === 1 ? '#000000' : '#4b5563',
                                    fontWeight: cIdx === 1 ? 800 : 600,
                                    borderRight: cIdx === 0 ? '1.5px solid #000' : 'none',
                                  }}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Key Insight Box (If any) */}
                  {section.keyInsight && (
                    <div
                      style={{
                        background: '#000000',
                        color: '#ffffff',
                        padding: '14px 18px',
                        border: '2px solid #000000',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        marginTop: 18,
                        boxShadow: '3px 3px 0 #FFE500',
                      }}
                    >
                      <Lightbulb size={18} color="#FFE500" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <span style={{ color: '#FFE500', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                          CORE TAKEAWAY:
                        </span>
                        <span style={{ fontSize: '0.9rem', lineHeight: 1.45, fontWeight: 700 }}>
                          {section.keyInsight}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Formula Box (If any) */}
                  {section.formulaBox && (
                    <div
                      style={{
                        marginTop: 22,
                        background: '#FFE500',
                        border: '2.5px solid #000000',
                        boxShadow: '4px 4px 0 #000000',
                        padding: '20px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <Flame size={18} color="#000" />
                        <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#000', fontFamily: 'monospace', textTransform: 'uppercase', margin: 0 }}>
                          {section.formulaBox.title}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {section.formulaBox.steps.map((st, sStepIdx) => (
                          <div
                            key={sStepIdx}
                            style={{
                              background: '#ffffff',
                              border: '2px solid #000000',
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 10,
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 900,
                                fontFamily: 'monospace',
                                fontSize: '0.78rem',
                                background: '#000000',
                                color: '#FFE500',
                                padding: '2px 6px',
                                flexShrink: 0,
                              }}
                            >
                              0{sStepIdx + 1}
                            </span>
                            <div>
                              <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#000000', fontFamily: 'monospace' }}>{st.step}</div>
                              <div style={{ fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.45, fontWeight: 500 }}>{st.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* Mid-Article In-Content Ad Placement */}
                {sIdx === 1 && (
                  <div style={{ margin: '14px 0' }}>
                    <AdBanner slot="rectangle" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Actionable Creator Checklist */}
          <section
            style={{
              marginTop: 40,
              background: '#ffffff',
              border: '2.5px solid #000000',
              boxShadow: '4px 4px 0 #000000',
              padding: 'clamp(18px, 3vw, 28px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <ListChecks size={20} color="#000000" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', color: '#000000', margin: 0 }}>
                Actionable Checklist For Your Next Video
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {post.content.actionableChecklist.map((chk, cIdx) => (
                <div
                  key={cIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 14px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: '0.9rem', color: '#18181b', fontWeight: 600, lineHeight: 1.45 }}>
                    {chk}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Newsletter Course Card */}
          <NewsletterCard />

          {/* ── COMPACT BOTTOM REFERENCE MATERIAL (At The Bottom) ── */}
          {post.videoCredit && (
            <section
              style={{
                marginTop: 40,
                background: '#f9fafb',
                border: '2px solid #000000',
                boxShadow: '4px 4px 0 #000000',
                padding: 'clamp(18px, 3vw, 24px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Film size={16} color="#000" />
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', margin: 0 }}>
                    Source Video &amp; Reference Material
                  </h4>
                </div>
                <a
                  href={post.videoCredit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#000000',
                    textDecoration: 'none',
                    fontSize: '0.72rem',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: '#FFE500',
                    padding: '2px 8px',
                    border: '1px solid #000',
                    borderRadius: 3,
                    boxShadow: '1.5px 1.5px 0 #000',
                  }}
                >
                  {post.instagramUrl ? 'Watch on Instagram' : 'Watch Source Video'} <ExternalLink size={11} />
                </a>
              </div>

              <p style={{ fontSize: '0.8rem', color: '#52525b', margin: '0 0 14px', lineHeight: 1.4 }}>
                Credits to <strong>{post.videoCredit.channel}</strong> for the breakdown: <em>&ldquo;{post.videoCredit.title}&rdquo;</em>.
              </p>

              {post.youtubeId && (
                <div style={{ maxWidth: 560, margin: '0 auto', border: '2px solid #000000', background: '#000000', overflow: 'hidden' }}>
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                    <iframe
                      width="100%"
                      height="315"
                      src={post.youtubeEmbedUrl || `https://www.youtube.com/embed/${post.youtubeId}?si=ulN5UqtMYJZrLNP6`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        border: 'none',
                      }}
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Practice in Studio CTA */}
          <section
            style={{
              marginTop: 32,
              background: '#000000',
              color: '#ffffff',
              border: '3px solid #000000',
              boxShadow: '5px 5px 0 #FFE500',
              padding: 'clamp(20px, 3vw, 28px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <span style={{ color: '#FFE500', fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                READY TO CREATE?
              </span>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 6px' }}>
                Practice This In CreatorKit Studio
              </h4>
              <p style={{ color: '#a1a1aa', fontSize: '0.82rem', margin: 0 }}>
                Use Studio Teleprompter with bracket stage cues or test titles in Thumbnail Lab.
              </p>
            </div>

            <Link
              href="/teleprompter"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 20px',
                background: '#FFE500',
                color: '#000000',
                border: '2px solid #000',
                fontWeight: 900,
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                textDecoration: 'none',
                boxShadow: '2px 2px 0 #fff',
              }}
            >
              Open Teleprompter &rarr;
            </Link>
          </section>
        </main>

        {/* ── RIGHT COLUMN: PURE VERTICAL ADVERTISEMENT RAIL (Sticky) ── */}
        <aside style={{ minWidth: 280, position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Top Rectangle Ad (300x250) */}
          <AdBanner slot="rectangle" />

          {/* Vertical Skyscraper Ad Space */}
          <div
            style={{
              width: '100%',
              minHeight: 480,
              border: '2px dashed #9ca3af',
              background: '#ffffff',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 900, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
              ADVERTISEMENT
            </span>
            <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: '#9ca3af' }}>
              300 x 600 Half Page / Skyscraper
            </span>
          </div>

          {/* Bottom Sticky Rectangle Ad */}
          <AdBanner slot="rectangle" />
        </aside>
      </div>

      {/* ── "Read Our Next Article" Grid ── */}
      <section style={{ maxWidth: 1200, margin: '60px auto 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, background: '#000' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 900, letterSpacing: '0.08em', fontFamily: 'monospace', textTransform: 'uppercase', color: '#000000', margin: 0 }}>
              READ OUR NEXT CASE STUDY
            </h3>
          </div>

          <Link href="/blog" style={{ color: '#000', fontWeight: 900, fontFamily: 'monospace', fontSize: '0.78rem', textDecoration: 'none' }}>
            VIEW ALL ({BLOG_POSTS.length}) &rarr;
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(20px, 3vw, 28px)' }}>
          {otherPosts.slice(0, 3).map((nextPost) => (
            <Link
              key={nextPost.slug}
              href={`/blog/${nextPost.slug}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.15s ease',
              }}
            >
              {/* Top: Separated Image Container */}
              <div
                style={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  background: '#000000',
                  border: '2.5px solid #000000',
                  boxShadow: '3px 3px 0 #000000',
                  marginBottom: 14,
                  height: 170,
                  position: 'relative',
                }}
              >
                <img
                  src={nextPost.coverImage || (nextPost.youtubeId ? `https://img.youtube.com/vi/${nextPost.youtubeId}/hqdefault.jpg` : '')}
                  alt={nextPost.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    background: '#FFE500',
                    color: '#000000',
                    border: '1.5px solid #000',
                    padding: '2px 8px',
                    fontSize: '0.65rem',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    borderRadius: 3,
                  }}
                >
                  {nextPost.category}
                </span>
              </div>

              {/* Bottom: Text Content (Separated below the image) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontFamily: 'monospace', color: '#666', fontWeight: 700 }}>
                  <Clock size={12} color="#000" />
                  <span>{nextPost.readTime}</span>
                  <span>·</span>
                  <span>{nextPost.date}</span>
                </div>

                <h4
                  style={{
                    fontSize: 'clamp(1rem, 2vw, 1.15rem)',
                    fontWeight: 900,
                    lineHeight: 1.3,
                    letterSpacing: '-0.02em',
                    color: '#000000',
                    margin: 0,
                  }}
                >
                  {nextPost.title}
                </h4>

                <p
                  style={{
                    fontSize: '0.84rem',
                    color: '#4b5563',
                    lineHeight: 1.45,
                    margin: '2px 0 8px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    fontWeight: 500,
                  }}
                >
                  {nextPost.excerpt}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 3,
                      background: '#ffffff',
                      border: '1.5px solid #000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <img src="/logo.png" alt="CK" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#000000', fontWeight: 800, fontFamily: 'monospace' }}>
                    {nextPost.author.name}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Bottom Leaderboard Ad */}
      <div style={{ maxWidth: 1200, margin: '40px auto 0' }}>
        <AdBanner slot="leaderboard" />
      </div>
    </div>
  );
}
