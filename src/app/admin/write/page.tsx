'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  fetchPostBySlugFromDatabase,
  savePostToDatabase,
} from '@/lib/supabase';
import { type BlogPost } from '@/data/blog-posts';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Sparkles,
  ExternalLink,
  HelpCircle,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';

const CATEGORIES = [
  'Business & Deals',
  'Storytelling',
  'Retention',
  'Packaging & CTR',
  'Algorithms',
  'YouTube Strategy',
  'Marketing & Solopreneurship',
  'Audio & Sound',
];

const COVER_IMAGE_PRESETS = [
  { label: 'West Africa Creator', url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Studio Film Camera', url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Editing Workspace', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Finance & Contracts', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&auto=format&fit=crop&q=80' },
  { label: 'Audience & Growth', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&auto=format&fit=crop&q=80' },
];

function AdminPostEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSlug = searchParams.get('slug');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form State
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState(COVER_IMAGE_PRESETS[0].url);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [readTime, setReadTime] = useState('7 min read');
  const [featured, setFeatured] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['Creator Economy', 'Monetization']);

  // Media / References
  const [youtubeId, setYoutubeId] = useState('');
  const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [videoChannel, setVideoChannel] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Rich Content
  const [whatYoullLearn, setWhatYoullLearn] = useState<string[]>([
    'Core principle and misconception broken down in detail.',
    'Tactical implementation steps and mathematical formulas.',
    'Real-world numbers and case study examples.',
  ]);

  const [sections, setSections] = useState<any[]>([
    {
      id: 'act-1-the-friction',
      heading: 'Act I: The Core Friction & The Myth',
      subheading: 'Why the traditional method fails 95% of the time.',
      paragraphs: [
        'Write your detailed, long-form paragraphs here. Provide in-depth analysis, empirical observations, and behind-the-scenes psychology.',
        'The more detailed, plentiful, and concrete your case study is, the higher it ranks and the more authority your platform commands.',
      ],
      quote: {
        text: 'A memorable, high-impact quote summarizing the core philosophy.',
        speaker: 'CreatorKit Research Lab',
      },
      keyInsight: 'The single most important takeaway the reader must remember.',
    },
  ]);

  const [actionableChecklist, setActionableChecklist] = useState<string[]>([
    'Audit your current workflow against this framework.',
    'Apply the formula to your next 3 pieces of content.',
    'Track your retention, conversion, or revenue metrics.',
  ]);

  // Load existing post if editing
  useEffect(() => {
    if (!editSlug) return;
    setLoading(true);
    fetchPostBySlugFromDatabase(editSlug).then((post) => {
      if (post) {
        setSlug(post.slug);
        setTitle(post.title);
        setSubtitle(post.subtitle);
        setExcerpt(post.excerpt);
        setCoverImage(post.coverImage || COVER_IMAGE_PRESETS[0].url);
        setCategory(post.category);
        setReadTime(post.readTime);
        setFeatured(!!post.featured);
        setTags(post.tags);
        setYoutubeId(post.youtubeId || '');
        setYoutubeEmbedUrl(post.youtubeEmbedUrl || '');
        setInstagramUrl(post.instagramUrl || '');
        setVideoChannel(post.videoCredit?.channel || '');
        setVideoTitle(post.videoCredit?.title || '');
        setVideoUrl(post.videoCredit?.url || '');
        setWhatYoullLearn(post.content.whatYoullLearn || []);
        setSections(post.content.sections || []);
        setActionableChecklist(post.content.actionableChecklist || []);
      }
      setLoading(false);
    });
  }, [editSlug]);

  const generateSlug = () => {
    if (!title) return;
    const generated = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setSlug(generated);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  // Section Helpers
  const addSection = () => {
    const actNum = sections.length + 1;
    setSections([
      ...sections,
      {
        id: `act-${actNum}-section`,
        heading: `Act ${actNum}: Enter Section Heading`,
        subheading: 'Enter actionable subheading...',
        paragraphs: ['Write detailed paragraphs explaining the mechanics, examples, and breakdown.'],
        keyInsight: '',
      },
    ]);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const updateSectionField = (index: number, field: string, value: any) => {
    const updated = [...sections];
    updated[index][field] = value;
    setSections(updated);
  };

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) {
      alert('Title and Slug are required!');
      return;
    }

    setSaving(true);
    const postObject: BlogPost = {
      slug: slug.trim(),
      title: title.trim(),
      subtitle: subtitle.trim(),
      excerpt: excerpt.trim(),
      coverImage: coverImage.trim(),
      youtubeId: youtubeId.trim() || undefined,
      youtubeEmbedUrl: youtubeEmbedUrl.trim() || undefined,
      instagramUrl: instagramUrl.trim() || undefined,
      videoCredit: videoChannel || videoTitle ? { channel: videoChannel, title: videoTitle, url: videoUrl } : undefined,
      author: {
        name: 'CreatorKit Research Lab',
        role: 'Viral Storytelling & Creator Monetization',
      },
      tags,
      category,
      pillColor: { bg: '#FFE500', text: '#000000' },
      featured,
      readTime,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      content: {
        whatYoullLearn,
        sections,
        actionableChecklist,
        relatedTools: [
          {
            name: 'Studio Teleprompter',
            href: '/teleprompter',
            desc: 'Practice delivering retention-engineered scripts with voice-matching scrolling.',
            badge: 'SCRIPTING',
          },
          {
            name: 'Invoices & Deals',
            href: '/business',
            desc: 'Generate branded GHS, NGN, and USD invoices with MoMo, Bank, and Paystack channels.',
            badge: 'BUSINESS',
          },
        ],
      },
    };

    const res = await savePostToDatabase(postObject);
    setSaving(false);

    if (res.success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } else {
      alert(`Save error: ${res.error}`);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        Loading masterclass editor...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', color: '#000', padding: '32px 20px 100px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        {/* Navigation & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <Link
            href="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#fff',
              border: '2px solid #000',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 900,
              fontFamily: 'monospace',
              boxShadow: '2px 2px 0 #000',
              textDecoration: 'none',
              color: '#000',
            }}
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {slug && (
              <Link
                href={`/blog/${slug}`}
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
                <ExternalLink size={14} /> Preview Live
              </Link>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#FFE500',
                color: '#000',
                border: '2px solid #000',
                padding: '8px 20px',
                fontSize: '0.82rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                boxShadow: '2px 2px 0 #000',
                cursor: saving ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
              }}
            >
              <Save size={16} />
              {saving ? 'Publishing to Supabase...' : 'Save & Publish to Supabase'}
            </button>
          </div>
        </div>

        {savedSuccess && (
          <div
            style={{
              background: '#dcfce7',
              border: '2px solid #16a34a',
              color: '#166534',
              padding: '12px 18px',
              marginBottom: 24,
              fontSize: '0.85rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontFamily: 'monospace',
              boxShadow: '3px 3px 0 #16a34a',
            }}
          >
            <CheckCircle2 size={18} />
            <span>Masterclass successfully saved to Supabase! Live at /blog/{slug}</span>
          </div>
        )}

        {/* ── 1. BASIC INFORMATION CARD ── */}
        <div style={{ background: '#fff', border: '2px solid #000', boxShadow: '4px 4px 0 #000', padding: 24, marginBottom: 24 }}>
          <div style={{ borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
              1. Title, Slug &amp; Category
            </span>
            <span style={{ fontSize: '0.7rem', color: '#666', fontFamily: 'monospace' }}>High-Impact Packaging</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Title */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                Article Title (Follow High-CTR Formula)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. "Going Viral Doesn’t Pay Your Rent": The Ghana & Nigeria Creator Guide'
                style={{ width: '100%', padding: '10px 12px', border: '2px solid #000', fontSize: '1rem', fontWeight: 800, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>

            {/* Subtitle */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                Subtitle / Core Hook
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="A CreatorKit deep dive into the business models and psychology of modern monetization..."
                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #000', fontSize: '0.88rem', fontWeight: 600, outline: 'none' }}
              />
            </div>

            {/* Slug & Auto Button */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                  URL Slug (/blog/[slug])
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="going-viral-does-not-pay-the-bills"
                  style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #000', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none' }}
                />
              </div>
              <button
                type="button"
                onClick={generateSlug}
                style={{ background: '#f4f4f5', border: '1.5px solid #000', padding: '8px 14px', fontSize: '0.75rem', fontWeight: 900, fontFamily: 'monospace', cursor: 'pointer', height: 40 }}
              >
                Auto Generate Slug
              </button>
            </div>

            {/* Excerpt */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                Excerpt (For Feed Card &amp; Google SEO Meta Description)
              </label>
              <textarea
                rows={3}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="2 to 3 sentences summarizing the counter-intuitive findings and actionable tools..."
                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #000', fontSize: '0.85rem', lineHeight: 1.4, outline: 'none' }}
              />
            </div>

            {/* Category & Read Time & Featured */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #000', fontSize: '0.82rem', fontWeight: 800, fontFamily: 'monospace', outline: 'none' }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                  Read Time
                </label>
                <input
                  type="text"
                  value={readTime}
                  onChange={(e) => setReadTime(e.target.value)}
                  placeholder="8 min read"
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #000', fontSize: '0.82rem', fontFamily: 'monospace', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                <input
                  type="checkbox"
                  id="featured"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <label htmlFor="featured" style={{ fontSize: '0.78rem', fontWeight: 900, fontFamily: 'monospace', cursor: 'pointer' }}>
                  FEATURED HERO ARTICLE
                </label>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                Tags &amp; Keywords
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                  placeholder="Add a tag (e.g. Ghana, Pricing, Retention) and press Enter..."
                  style={{ flex: 1, padding: '6px 10px', border: '1.5px solid #000', fontSize: '0.82rem', fontFamily: 'monospace', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  style={{ background: '#000', color: '#FFE500', border: '1.5px solid #000', padding: '6px 12px', fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', cursor: 'pointer' }}
                >
                  Add Tag
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      background: '#fef08a',
                      border: '1.5px solid #000',
                      padding: '2px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 900 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Cover Image */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                Cover Image URL
              </label>
              <input
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #000', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace', color: '#666' }}>PRESETS:</span>
                {COVER_IMAGE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setCoverImage(p.url)}
                    style={{ background: '#fff', border: '1px solid #000', padding: '2px 8px', fontSize: '0.68rem', fontFamily: 'monospace', cursor: 'pointer' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. MEDIA & SOURCE VIDEO (OPTIONAL) ── */}
        <div style={{ background: '#fff', border: '2px solid #000', boxShadow: '4px 4px 0 #000', padding: 24, marginBottom: 24 }}>
          <div style={{ borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 18 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
              2. Video Attribution &amp; Source (YouTube / Instagram)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                YouTube Embed URL (Optional)
              </label>
              <input
                type="text"
                value={youtubeEmbedUrl}
                onChange={(e) => setYoutubeEmbedUrl(e.target.value)}
                placeholder="https://www.youtube.com/embed/QHhJ8_TJeNo"
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #000', fontSize: '0.82rem', fontFamily: 'monospace', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                Instagram Reel URL (Optional)
              </label>
              <input
                type="text"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://www.instagram.com/reel/Db-zJhiuXP3/..."
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #000', fontSize: '0.82rem', fontFamily: 'monospace', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                Channel / Creator Name
              </label>
              <input
                type="text"
                value={videoChannel}
                onChange={(e) => setVideoChannel(e.target.value)}
                placeholder="e.g. Creator Masterclass"
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #000', fontSize: '0.82rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                Source Video Title
              </label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g. The Dopamine Addiction Loop"
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #000', fontSize: '0.82rem', outline: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* ── 3. "WHAT YOU'LL LEARN" CARD ── */}
        <div style={{ background: '#fff', border: '2px solid #000', boxShadow: '4px 4px 0 #000', padding: 24, marginBottom: 24 }}>
          <div style={{ borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
              3. "What You'll Learn" Key Takeaways Box
            </span>
            <button
              type="button"
              onClick={() => setWhatYoullLearn([...whatYoullLearn, 'New key takeaway...'])}
              style={{ background: '#000', color: '#FFE500', border: '1.5px solid #000', padding: '4px 10px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', cursor: 'pointer' }}
            >
              + Add Bullet
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {whatYoullLearn.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.75rem' }}>{idx + 1}.</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const updated = [...whatYoullLearn];
                    updated[idx] = e.target.value;
                    setWhatYoullLearn(updated);
                  }}
                  style={{ flex: 1, padding: '8px 10px', border: '1.5px solid #000', fontSize: '0.85rem', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setWhatYoullLearn(whatYoullLearn.filter((_, i) => i !== idx))}
                  style={{ background: '#fee2e2', color: '#dc2626', border: '1.5px solid #dc2626', padding: '6px 10px', cursor: 'pointer' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. MULTI-ACT SECTION BUILDER (THE ENGINE FOR LONG ARTICLES) ── */}
        <div style={{ background: '#fff', border: '2px solid #000', boxShadow: '4px 4px 0 #000', padding: 24, marginBottom: 24 }}>
          <div style={{ borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
                4. Multi-Act Story Sections ({sections.length} Acts)
              </span>
              <p style={{ fontSize: '0.72rem', color: '#666', margin: '2px 0 0', fontFamily: 'monospace' }}>
                Build plentiful, deep-dive acts with multi-paragraph analysis, quotes, and takeaways.
              </p>
            </div>
            <button
              type="button"
              onClick={addSection}
              style={{ background: '#FFE500', color: '#000', border: '2px solid #000', padding: '6px 14px', fontSize: '0.75rem', fontWeight: 900, fontFamily: 'monospace', cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}
            >
              + Add Next Act
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {sections.map((sec, sIdx) => (
              <div
                key={sIdx}
                style={{
                  border: '2px solid #000',
                  padding: 18,
                  background: '#fafafa',
                  boxShadow: '3px 3px 0 rgba(0,0,0,0.15)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, fontFamily: 'monospace', background: '#000', color: '#FFE500', padding: '2px 8px', textTransform: 'uppercase' }}>
                    Act #{sIdx + 1}
                  </span>
                  {sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSection(sIdx)}
                      style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #dc2626', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', cursor: 'pointer' }}
                    >
                      Delete Act
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 2 }}>
                      Act Heading
                    </label>
                    <input
                      type="text"
                      value={sec.heading}
                      onChange={(e) => updateSectionField(sIdx, 'heading', e.target.value)}
                      placeholder="Act I: The CPM Trap"
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #000', fontSize: '0.92rem', fontWeight: 800, outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 2 }}>
                      Act Subheading
                    </label>
                    <input
                      type="text"
                      value={sec.subheading || ''}
                      onChange={(e) => updateSectionField(sIdx, 'subheading', e.target.value)}
                      placeholder="Why organic views are only 20% of the deal's commercial value..."
                      style={{ width: '100%', padding: '6px 10px', border: '1.5px solid #000', fontSize: '0.82rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 2 }}>
                      Detailed Paragraphs (Separate paragraphs with double Enter / blank lines)
                    </label>
                    <textarea
                      rows={6}
                      value={Array.isArray(sec.paragraphs) ? sec.paragraphs.join('\n\n') : sec.paragraphs}
                      onChange={(e) => updateSectionField(sIdx, 'paragraphs', e.target.value.split('\n\n').filter(Boolean))}
                      placeholder="Write extensive, long-form paragraphs. Deep-dive into data, psychology, and tactical implementation..."
                      style={{ width: '100%', padding: '10px', border: '1.5px solid #000', fontSize: '0.85rem', lineHeight: 1.5, outline: 'none' }}
                    />
                  </div>

                  {/* Key Insight */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 2 }}>
                      💡 Key Insight Callout (Optional)
                    </label>
                    <input
                      type="text"
                      value={sec.keyInsight || ''}
                      onChange={(e) => updateSectionField(sIdx, 'keyInsight', e.target.value)}
                      placeholder="One punchy sentence summarizing the takeaway of this act..."
                      style={{ width: '100%', padding: '6px 10px', border: '1.5px solid #000', fontSize: '0.82rem', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. ACTIONABLE CHECKLIST ── */}
        <div style={{ background: '#fff', border: '2px solid #000', boxShadow: '4px 4px 0 #000', padding: 24, marginBottom: 24 }}>
          <div style={{ borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 900, fontFamily: 'monospace', textTransform: 'uppercase' }}>
              5. Actionable Implementation Checklist
            </span>
            <button
              type="button"
              onClick={() => setActionableChecklist([...actionableChecklist, 'New checklist action item...'])}
              style={{ background: '#000', color: '#FFE500', border: '1.5px solid #000', padding: '4px 10px', fontSize: '0.7rem', fontWeight: 900, fontFamily: 'monospace', cursor: 'pointer' }}
            >
              + Add Item
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {actionableChecklist.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.75rem' }}>✓</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const updated = [...actionableChecklist];
                    updated[idx] = e.target.value;
                    setActionableChecklist(updated);
                  }}
                  style={{ flex: 1, padding: '8px 10px', border: '1.5px solid #000', fontSize: '0.85rem', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setActionableChecklist(actionableChecklist.filter((_, i) => i !== idx))}
                  style={{ background: '#fee2e2', color: '#dc2626', border: '1.5px solid #dc2626', padding: '6px 10px', cursor: 'pointer' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Save Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
          <Link
            href="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#fff',
              border: '2px solid #000',
              padding: '10px 18px',
              fontSize: '0.82rem',
              fontWeight: 900,
              fontFamily: 'monospace',
              textDecoration: 'none',
              color: '#000',
            }}
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#FFE500',
              color: '#000',
              border: '2px solid #000',
              padding: '10px 28px',
              fontSize: '0.88rem',
              fontWeight: 900,
              fontFamily: 'monospace',
              boxShadow: '3px 3px 0 #000',
              cursor: saving ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
            }}
          >
            <Save size={18} />
            {saving ? 'Publishing to Supabase...' : 'Save & Publish to Supabase'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminWritePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'monospace' }}>Loading editor...</div>}>
      <AdminPostEditor />
    </Suspense>
  );
}
