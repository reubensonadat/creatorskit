'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchPostsFromDatabase,
  deletePostFromDatabase,
  savePostToDatabase,
  migrateAllLocalPostsToSupabase,
  supabase,
} from '@/lib/supabase';
import { BLOG_POSTS, type BlogPost } from '@/data/blog-posts';
import {
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Database,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Star,
  FileText,
  Receipt,
  ArrowRight,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [receiptCount, setReceiptCount] = useState<number>(0);
  const [dbConnected, setDbConnected] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const fetched = await fetchPostsFromDatabase();
      setPosts(fetched);

      // Fetch receipt count from Supabase
      const { count } = await supabase
        .from('receipts')
        .select('*', { count: 'exact', head: true });
      if (count !== null) {
        setReceiptCount(count);
      }
    } catch (err) {
      console.error(err);
      setDbConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMigrate = async () => {
    if (!confirm('This will seed/sync all 11+ comprehensive local masterclasses into your Supabase database. Continue?')) {
      return;
    }
    setMigrating(true);
    setMigrationStatus('Syncing articles to Supabase...');
    try {
      const res = await migrateAllLocalPostsToSupabase();
      if (res.errors.length > 0) {
        setMigrationStatus(`Migrated ${res.successCount}/${res.total} posts. (Some had errors: ${res.errors[0]})`);
      } else {
        setMigrationStatus(`🎉 Successfully migrated all ${res.successCount} masterclasses to Supabase!`);
      }
      await loadData();
    } catch (err: any) {
      setMigrationStatus(`Migration failed: ${err.message}`);
    } finally {
      setMigrating(false);
      setTimeout(() => setMigrationStatus(null), 6000);
    }
  };

  const handleDelete = async (slug: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    const res = await deletePostFromDatabase(slug);
    if (res.success) {
      setPosts(posts.filter((p) => p.slug !== slug));
    } else {
      alert(`Failed to delete: ${res.error}`);
    }
  };

  const handleToggleFeatured = async (post: BlogPost) => {
    const updated = { ...post, featured: !post.featured };
    const res = await savePostToDatabase(updated);
    if (res.success) {
      setPosts(posts.map((p) => (p.slug === post.slug ? updated : p)));
    } else {
      alert('Failed to update featured flag');
    }
  };

  const categories = ['All', ...Array.from(new Set(posts.map((p) => p.category)))];

  const filteredPosts = posts.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', color: '#000', padding: '32px 20px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Top Breadcrumb & Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                background: '#FFE500',
                border: '2px solid #000',
                padding: '2px 8px',
                fontSize: '0.72rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                boxShadow: '2px 2px 0 #000',
              }}
            >
              CREATORKIT OS
            </span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>
              Admin &amp; Content Management
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link
              href="/blog"
              target="_blank"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#fff',
                border: '2px solid #000',
                padding: '8px 14px',
                fontSize: '0.78rem',
                fontWeight: 800,
                fontFamily: 'monospace',
                boxShadow: '2px 2px 0 #000',
                textDecoration: 'none',
                color: '#000',
              }}
            >
              <ExternalLink size={14} /> View Live Blog
            </Link>
            <Link
              href="/admin/write"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#FFE500',
                border: '2px solid #000',
                padding: '8px 16px',
                fontSize: '0.78rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                boxShadow: '2px 2px 0 #000',
                textDecoration: 'none',
                color: '#000',
                textTransform: 'uppercase',
              }}
            >
              <Plus size={16} /> Write New Masterclass
            </Link>
          </div>
        </div>

        {/* Database & Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
          {/* Card 1: Supabase Status */}
          <div
            style={{
              background: '#fff',
              border: '2px solid #000',
              boxShadow: '3px 3px 0 #000',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', color: '#666', textTransform: 'uppercase' }}>
                  DATABASE BACKEND
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    color: '#16a34a',
                    background: '#dcfce7',
                    padding: '2px 6px',
                    border: '1px solid #16a34a',
                  }}
                >
                  <CheckCircle2 size={12} /> SUPABASE CONNECTED
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#444', wordBreak: 'break-all' }}>
                lnfzixiwmdxoqoueadkq.supabase.co
              </div>
            </div>

            <button
              onClick={handleMigrate}
              disabled={migrating}
              style={{
                marginTop: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: '#000',
                color: '#FFE500',
                border: '2px solid #000',
                padding: '10px 14px',
                fontSize: '0.76rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                cursor: migrating ? 'not-allowed' : 'pointer',
                boxShadow: '2px 2px 0 rgba(0,0,0,0.2)',
              }}
            >
              <Database size={14} />
              {migrating ? 'Seeding Database...' : 'Seed / Sync All Masterclasses to Supabase'}
            </button>
          </div>

          {/* Card 2: Article Count */}
          <div
            style={{
              background: '#fff',
              border: '2px solid #000',
              boxShadow: '3px 3px 0 #000',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', color: '#666', textTransform: 'uppercase' }}>
                PUBLISHED ARTICLES
              </span>
              <FileText size={18} color="#000" />
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, margin: '8px 0', letterSpacing: '-0.03em' }}>
              {posts.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>
              Across {categories.length - 1} content categories
            </div>
          </div>

          {/* Card 3: Digital Receipts Count */}
          <div
            style={{
              background: '#fff',
              border: '2px solid #000',
              boxShadow: '3px 3px 0 #000',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', color: '#666', textTransform: 'uppercase' }}>
                DIGITAL RECEIPTS STORED
              </span>
              <Receipt size={18} color="#000" />
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, margin: '8px 0', letterSpacing: '-0.03em' }}>
              {receiptCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>
              Instant scannable /r/[id] short links
            </div>
          </div>
        </div>

        {/* Status Alert Banner */}
        {migrationStatus && (
          <div
            style={{
              background: '#FFE500',
              border: '2px solid #000',
              boxShadow: '3px 3px 0 #000',
              padding: '12px 18px',
              marginBottom: 24,
              fontSize: '0.85rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontFamily: 'monospace',
            }}
          >
            <Sparkles size={18} />
            <span>{migrationStatus}</span>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div
          style={{
            background: '#fff',
            border: '2px solid #000',
            boxShadow: '3px 3px 0 #000',
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {/* Categories */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  background: selectedCategory === cat ? '#000' : '#fff',
                  color: selectedCategory === cat ? '#FFE500' : '#000',
                  border: '1.5px solid #000',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 260 }}>
            <Search size={16} color="#666" />
            <input
              type="text"
              placeholder="Search by title or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: '1.5px solid #000',
                padding: '6px 10px',
                fontSize: '0.82rem',
                fontFamily: 'monospace',
                width: '100%',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Master Articles List */}
        <div
          style={{
            background: '#fff',
            border: '2px solid #000',
            boxShadow: '3px 3px 0 #000',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 20px', borderBottom: '2px solid #000', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
              Masterclasses &amp; Guides ({filteredPosts.length})
            </span>
            <button
              onClick={loadData}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 800, fontFamily: 'monospace' }}
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: 'monospace', fontSize: '0.9rem' }}>
              Loading articles from database...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: 'monospace' }}>
              <p style={{ fontWeight: 800, fontSize: '1rem' }}>No articles found</p>
              <p style={{ fontSize: '0.8rem', color: '#666' }}>Click "Seed / Sync All Masterclasses to Supabase" to import initial content.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredPosts.map((post, idx) => (
                <div
                  key={post.slug}
                  style={{
                    padding: '16px 20px',
                    borderBottom: idx === filteredPosts.length - 1 ? 'none' : '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                    background: post.featured ? '#fefce8' : '#fff',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          fontFamily: 'monospace',
                          background: '#000',
                          color: '#FFE500',
                          padding: '1px 6px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {post.category}
                      </span>
                      {post.featured && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 900,
                            fontFamily: 'monospace',
                            background: '#FFE500',
                            color: '#000',
                            border: '1px solid #000',
                            padding: '1px 6px',
                            textTransform: 'uppercase',
                          }}
                        >
                          FEATURED
                        </span>
                      )}
                      <span style={{ fontSize: '0.72rem', color: '#666', fontFamily: 'monospace' }}>
                        {post.readTime} · {post.date}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.02rem', fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                      {post.title}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#555', margin: 0, lineHeight: 1.4, maxWidth: 800 }}>
                      {post.excerpt}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => handleToggleFeatured(post)}
                      title="Toggle Featured Post"
                      style={{
                        background: post.featured ? '#FFE500' : '#fff',
                        border: '1.5px solid #000',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                      }}
                    >
                      <Star size={13} fill={post.featured ? '#000' : 'none'} />
                    </button>

                    <Link
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      title="View Article"
                      style={{
                        background: '#fff',
                        border: '1.5px solid #000',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#000',
                        textDecoration: 'none',
                      }}
                    >
                      <ExternalLink size={14} />
                    </Link>

                    <Link
                      href={`/admin/write?slug=${post.slug}`}
                      title="Edit Masterclass"
                      style={{
                        background: '#000',
                        color: '#FFE500',
                        border: '1.5px solid #000',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        fontFamily: 'monospace',
                        textDecoration: 'none',
                        textTransform: 'uppercase',
                      }}
                    >
                      <Edit size={13} /> Edit
                    </Link>

                    <button
                      onClick={() => handleDelete(post.slug, post.title)}
                      title="Delete Article"
                      style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1.5px solid #dc2626',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
