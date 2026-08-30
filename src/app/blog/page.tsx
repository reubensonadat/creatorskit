'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BLOG_POSTS, type BlogPost } from '@/data/blog-posts';
import { fetchPostsFromDatabase } from '@/lib/supabase';
import AdBanner from '@/components/AdBanner';
import {
  ArrowUpRight,
  Clock,
  Search,
  Sparkles,
  TrendingUp,
  Tag,
} from 'lucide-react';

export default function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogPost[]>(BLOG_POSTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');

  useEffect(() => {
    fetchPostsFromDatabase().then((data) => {
      if (data && data.length > 0) {
        setPosts(data);
      }
    });
  }, []);

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    posts.forEach((p) => p.tags.forEach((t) => tagsSet.add(t)));
    return ['All', ...Array.from(tagsSet)];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag = selectedTag === 'All' || post.tags.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [posts, searchQuery, selectedTag]);

  // Featured post (latest/highlighted)
  const featuredPost = useMemo(() => {
    return posts.find((p) => p.featured) || posts[0] || BLOG_POSTS[0];
  }, [posts]);

  // Remaining posts for the clean separated card grid
  const gridPosts = useMemo(() => {
    if (!featuredPost) return filteredPosts;
    if (searchQuery || selectedTag !== 'All') {
      return filteredPosts;
    }
    return filteredPosts.filter((p) => p.slug !== featuredPost.slug);
  }, [filteredPosts, featuredPost, searchQuery, selectedTag]);

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', color: '#000000', paddingBottom: 100 }}>
      {/* ── Top Header Section (Matching User Specs) ── */}
      <header style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(32px, 5vw, 56px) clamp(16px, 4vw, 24px) 20px' }}>
        {/* Tiny pill tag */}
        <div style={{ marginBottom: 12 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#FFE500',
              color: '#000000',
              border: '2px solid #000',
              padding: '2px 8px',
              fontSize: '0.72rem',
              fontWeight: 900,
              fontFamily: 'monospace',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              borderRadius: 4,
              boxShadow: '2px 2px 0 #000',
            }}
          >
            CREATORKIT BLOG
          </span>
        </div>

        {/* Page Title */}
        <h1
          style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
            fontWeight: 900,
            letterSpacing: '-0.035em',
            lineHeight: 1.12,
            color: '#000000',
            margin: '0 0 10px',
          }}
        >
          Browse Our Resources
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
            color: '#52525b',
            margin: 0,
            maxWidth: 680,
            lineHeight: 1.5,
            fontWeight: 500,
          }}
        >
          We provide breakdowns, retention formulas, and resources from industry leaders. For free.
        </p>
      </header>

      {/* ── Main Container ── */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(16px, 4vw, 24px)' }}>
        {/* ── FEATURED HERO CARD (Full-bleed with bottom overlay, borderRadius: 4px) ── */}
        {!searchQuery && selectedTag === 'All' && featuredPost && (
          <section style={{ marginBottom: 40 }}>
            <Link
              href={`/blog/${featuredPost.slug}`}
              style={{
                display: 'block',
                position: 'relative',
                borderRadius: 4,
                overflow: 'hidden',
                background: '#000000',
                border: '3px solid #000000',
                boxShadow: '6px 6px 0 #000000',
                minHeight: 'clamp(380px, 46vw, 500px)',
                textDecoration: 'none',
                color: '#ffffff',
                transition: 'transform 0.15s ease',
              }}
            >
              {/* Full-bleed background image */}
              <img
                src={featuredPost.coverImage || `https://img.youtube.com/vi/${featuredPost.youtubeId}/maxresdefault.jpg`}
                alt={featuredPost.title}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />

              {/* Frosted/Dark Bottom Overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 60%, rgba(0,0,0,0) 100%)',
                  padding: 'clamp(20px, 4vw, 36px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {/* Title & Clickable Arrow Button */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <h2
                    style={{
                      fontSize: 'clamp(1.3rem, 3.2vw, 2.1rem)',
                      fontWeight: 900,
                      lineHeight: 1.2,
                      letterSpacing: '-0.025em',
                      color: '#ffffff',
                      margin: 0,
                      maxWidth: 820,
                    }}
                  >
                    {featuredPost.title}
                  </h2>

                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 4,
                      background: '#FFE500',
                      border: '2px solid #000',
                      boxShadow: '2px 2px 0 #000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000000',
                      flexShrink: 0,
                    }}
                  >
                    <ArrowUpRight size={20} />
                  </div>
                </div>

                {/* Subtitle */}
                <p
                  style={{
                    fontSize: 'clamp(0.85rem, 1.8vw, 0.96rem)',
                    color: '#e4e4e7',
                    lineHeight: 1.5,
                    margin: 0,
                    maxWidth: 760,
                  }}
                >
                  {featuredPost.subtitle}
                </p>

                {/* Footer Info: Author Avatar (with logo.png), Date & Yellow Tag Chips */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    borderTop: '1px solid rgba(255,255,255,0.2)',
                    paddingTop: 14,
                    marginTop: 4,
                  }}
                >
                  {/* Author & Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
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
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                      {featuredPost.author.name}
                    </span>
                    <span style={{ color: '#FFE500' }}>·</span>
                    <span style={{ fontSize: '0.78rem', color: '#d4d4d8', fontFamily: 'monospace' }}>
                      {featuredPost.date}
                    </span>
                  </div>

                  {/* Yellow Tag Chips (matching header buttons) */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {featuredPost.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        style={{
                          background: '#FFE500',
                          color: '#000000',
                          border: '1.5px solid #000',
                          boxShadow: '1.5px 1.5px 0 #000',
                          borderRadius: 3,
                          padding: '2px 8px',
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          fontFamily: 'monospace',
                          textTransform: 'uppercase',
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* ── TOP AD BANNER ── */}
        <div style={{ marginBottom: 32 }}>
          <AdBanner slot="leaderboard" />
        </div>

        {/* ── FILTER & SEARCH BAR (Scrollable buttons on left, search on right) ── */}
        <section
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #000000',
            paddingBottom: 16,
            marginBottom: 36,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          {/* Scrollable Category Filter Buttons on the Left */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
              flex: 1,
              minWidth: 260,
            }}
          >
            {allTags.map((tag) => {
              const isActive = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  style={{
                    background: isActive ? '#FFE500' : '#ffffff',
                    color: '#000000',
                    border: '2px solid #000000',
                    boxShadow: isActive ? '2px 2px 0 #000000' : 'none',
                    borderRadius: 4,
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.12s',
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Search Input Box on the Right */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#ffffff',
              border: '2px solid #000000',
              borderRadius: 4,
              boxShadow: '2px 2px 0 #000000',
              padding: '6px 12px',
              minWidth: 220,
            }}
          >
            <Search size={14} color="#000" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#000000',
                background: 'transparent',
                width: '100%',
                fontFamily: 'monospace',
              }}
            />
          </div>
        </section>

        {/* ── CARD GRID (Separated Image on top, Text below, borderRadius: 4px) ── */}
        <section>
          {gridPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' }}>No case studies found matching &ldquo;{searchQuery}&rdquo;</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedTag('All'); }}
                style={{
                  marginTop: 12,
                  padding: '8px 18px',
                  background: '#FFE500',
                  color: '#000000',
                  border: '2px solid #000',
                  borderRadius: 4,
                  fontSize: '0.8rem',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0 #000',
                }}
              >
                CLEAR FILTERS
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 'clamp(20px, 3.5vw, 32px)',
              }}
            >
              {gridPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
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
                      height: 'clamp(180px, 22vw, 220px)',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={post.coverImage || (post.youtubeId ? `https://img.youtube.com/vi/${post.youtubeId}/hqdefault.jpg` : '')}
                      alt={post.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
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
                      {post.category}
                    </span>
                  </div>

                  {/* Bottom: Text Content Area (Separated below the image) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {/* Read Time & Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontFamily: 'monospace', color: '#666', fontWeight: 700 }}>
                      <Clock size={12} color="#000" />
                      <span>{post.readTime}</span>
                      <span>·</span>
                      <span>{post.date}</span>
                    </div>

                    {/* Blog Title */}
                    <h3
                      style={{
                        fontSize: 'clamp(1.05rem, 2vw, 1.22rem)',
                        fontWeight: 900,
                        lineHeight: 1.3,
                        letterSpacing: '-0.02em',
                        color: '#000000',
                        margin: 0,
                      }}
                    >
                      {post.title}
                    </h3>

                    {/* Excerpt Snippet */}
                    <p
                      style={{
                        fontSize: '0.86rem',
                        color: '#4b5563',
                        lineHeight: 1.5,
                        margin: '2px 0 10px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontWeight: 500,
                      }}
                    >
                      {post.excerpt}
                    </p>

                    {/* Author Byline with /logo.png */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                      <div
                        style={{
                          width: 22,
                          height: 22,
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
                      <span style={{ fontSize: '0.76rem', color: '#000000', fontWeight: 800, fontFamily: 'monospace' }}>
                        {post.author.name}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── BOTTOM AD BANNER ── */}
        <div style={{ margin: '60px 0 20px' }}>
          <AdBanner slot="leaderboard" />
        </div>
      </main>
    </div>
  );
}
