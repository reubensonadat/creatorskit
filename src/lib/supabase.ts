import { createClient } from '@supabase/supabase-js';
import { BLOG_POSTS, type BlogPost } from '@/data/blog-posts';
import { inferYouTubeCategory } from './youtube-categories';
import { relativeStringToISODate } from './date-utils';
import { decodeReceipt, encodeReceipt } from './receipt/receipt-link';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lnfzixiwmdxoqoueadkq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZnppeGl3bWR4b3FvdWVhZGtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NDY1NDksImV4cCI6MjEwMzUyMjU0OX0.Y-VNay9jo6n20wQBMl0lTkzVnmjQqhcMiysNW66i76A';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface StoredReceipt {
  id: string; // short code e.g. "rcpt_k8w2"
  receipt_number: string;
  creator_name: string;
  creator_email?: string;
  creator_phone?: string;
  client_name: string;
  currency: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  payment_channel?: string;
  payload_string: string;
  metadata?: any;
  created_at?: string;
}

/**
 * Save a receipt to Supabase and local storage, returning the short code for branded share links.
 */
export async function saveReceiptToDatabase(data: {
  receiptNumber: string;
  creatorName: string;
  creatorEmail?: string;
  creatorPhone?: string;
  clientName: string;
  currency: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentChannel?: string;
  payloadString: string;
  metadata?: any;
}): Promise<string> {
  // Generate random 6-character clean slug
  const shortId = Math.random().toString(36).substring(2, 8);

  const record: StoredReceipt = {
    id: shortId,
    receipt_number: data.receiptNumber,
    creator_name: data.creatorName,
    creator_email: data.creatorEmail,
    creator_phone: data.creatorPhone,
    client_name: data.clientName,
    currency: data.currency,
    total_amount: data.totalAmount,
    amount_paid: data.amountPaid,
    balance_due: data.balanceDue,
    status: data.amountPaid >= data.totalAmount ? 'paid' : 'partial',
    payment_channel: data.paymentChannel,
    payload_string: data.payloadString,
    metadata: data.metadata,
  };

  // 1. Save to Next.js local documents API
  try {
    if (typeof window !== 'undefined') {
      fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      }).catch(() => {});

      // 2. Also keep in client localStorage for instant offline retrieval
      localStorage.setItem(`ck_doc_${shortId}`, JSON.stringify(record));
    }
  } catch (e) {
    // Ignore storage errors
  }

  // 3. Save to Supabase
  try {
    await supabase.from('receipts').insert([record]);
  } catch (err) {
    // Supabase non-blocking fallback
  }

  return shortId;
}

/**
 * Fetch a receipt by its short code. Checks Supabase, local API, and localStorage.
 */
export async function getReceiptByShortId(id: string): Promise<StoredReceipt | null> {
  // 1. Check local storage if in browser
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`ck_doc_${id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.payload_string) return parsed as StoredReceipt;
      }
    } catch (e) {}
  }

  // 2. Check Next.js local API
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/documents?id=${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.payload_string) return json.data as StoredReceipt;
      }
    } catch (e) {}
  }

  // 3. Check Supabase
  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return data as StoredReceipt;
    }
  } catch (err) {
    console.error('Error fetching receipt from Supabase:', err);
  }

  return null;
}

export interface SignatureData {
  clientName: string;
  clientTitle?: string;
  signatureDrawing?: string;
  auditId?: string;
}

/**
 * Updates a document in Supabase, local API, and localStorage with digital execution signatures.
 */
export async function updateReceiptSignature(
  id: string,
  signature: SignatureData
): Promise<StoredReceipt | null> {
  const existing = await getReceiptByShortId(id);
  if (!existing) return null;

  try {
    let payload = decodeReceipt(existing.payload_string);
    if (payload) {
      const now = new Date();
      const signedDate = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const auditId = signature.auditId || `CK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      payload = {
        ...payload,
        x: {
          ...(payload.x || {}),
          isSigned: true,
          sigClient: signature.clientName,
          sigClientTitle: signature.clientTitle || 'Authorized Representative',
          sigClientDate: signedDate,
          sigClientDrawing: signature.signatureDrawing,
          signedAuditId: auditId,
        },
      };

      const updatedPayloadString = encodeReceipt(payload);
      const updatedRecord: StoredReceipt = {
        ...existing,
        payload_string: updatedPayloadString,
        metadata: {
          ...(existing.metadata || {}),
          signed: true,
          signed_by: signature.clientName,
          signed_title: signature.clientTitle,
          signed_at: now.toISOString(),
          audit_id: auditId,
        },
      };

      // 1. Update localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`ck_doc_${id}`, JSON.stringify(updatedRecord));
        } catch {}

        // 2. Update local API
        fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedRecord),
        }).catch(() => {});
      }

      // 3. Update Supabase
      try {
        await supabase
          .from('receipts')
          .update({
            payload_string: updatedPayloadString,
            metadata: updatedRecord.metadata,
          })
          .eq('id', id);
      } catch {}

      return updatedRecord;
    }
  } catch (e) {
    console.error('Error updating receipt signature:', e);
  }

  return existing;
}

// ═══════════════════════════════════════════════════════════════
// 🌸 DIGITAL BOUQUET: 3D QR GIFT DATABASE
// ═══════════════════════════════════════════════════════════════

export type BouquetSceneType = 'tree' | 'bonsai' | 'wisteria' | 'maple' | 'pine' | 'house' | 'avatar' | string;

export interface CreatorCustomLink {
  id: string;
  title: string;
  url: string;
  emoji?: string;
}

export interface CreatorProfileData {
  creatorName: string;
  creatorTitle?: string;
  creatorBio?: string;
  avatarUrl?: string;
  socials: {
    youtube?: string;
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    twitch?: string;
    discord?: string;
    spotify?: string;
    github?: string;
    website?: string;
  };
  customLinks: CreatorCustomLink[];
}

export interface StoredBouquet {
  id: string;                    // Clean 6-character short code e.g. "k8w2ab"
  scene_type?: BouquetSceneType;  // tree species or scene
  season?: string;                // 'spring' | 'summer' | 'autumn' | 'winter'
  palette_id?: string;            // 'sakura' | 'wisteria' | etc.
  target_url?: string;            // the URL the QR encodes
  sender_name?: string;          // "From: ..."
  recipient_name?: string;       // "To: ..."
  message?: string;              // personal gift message
  gift_format?: string;          // 'both' | 'flower' | 'card'
  sound_preset?: string | null;  // 'music-box' | 'gentle-piano' | 'spring-garden' | 'harp-melody' | etc.
  audio_enabled?: boolean;       // ambient soundscape preference
  custom_colors?: any;           // custom palette overrides
  metadata?: {
    creatorProfile?: CreatorProfileData;
    flowers?: string[];
    greenery?: string[];
    seed?: number;
    cardFont?: string;
    cardPlacement?: string;
    giftFormat?: string;
    greeting?: string;
    closing?: string;
    soundPreset?: string | null;
    [key: string]: any;
  } | null;
  view_count?: number;           // track views
  created_at?: string;
}

/**
 * Save a Digital Bouquet to Supabase, Next.js local storage/API fallback, and return the clean 6-char short code.
 */
export async function saveBouquetToDatabase(data: {
  id?: string;
  sceneType?: BouquetSceneType;
  season?: string;
  paletteId?: string;
  targetUrl?: string;
  senderName?: string;
  recipientName?: string;
  message?: string;
  giftFormat?: string;
  soundPreset?: string | null;
  audioEnabled?: boolean;
  customColors?: any;
  metadata?: any;
}): Promise<string> {
  // Use client-generated ID or create clean 6-character alphanumeric short code
  const shortId = data.id || Math.random().toString(36).substring(2, 8);

  const payload: StoredBouquet = {
    id: shortId,
    scene_type: data.sceneType || 'botanical-2d',
    season: data.season || 'spring',
    palette_id: data.paletteId || 'classic-cream',
    target_url: data.targetUrl || '',
    sender_name: data.senderName || null || undefined,
    recipient_name: data.recipientName || null || undefined,
    message: data.message || null || undefined,
    gift_format: data.giftFormat || data.metadata?.giftFormat || 'both',
    sound_preset: data.soundPreset ?? data.metadata?.soundPreset ?? null,
    audio_enabled: data.audioEnabled ?? (Boolean(data.soundPreset)),
    custom_colors: data.customColors || null,
    metadata: data.metadata || null,
    view_count: 0,
    created_at: new Date().toISOString(),
  };

  // 1. Save to browser localStorage for instantaneous client load
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`ck_bouquet_${shortId}`, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
  }

  // 2. Persist to Next.js API route fallback
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/bouquets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {
      // Non-blocking
    }
  }

  // 3. Save to Supabase
  try {
    const dbRecord = {
      id: shortId,
      scene_type: payload.scene_type,
      season: payload.season,
      palette_id: payload.palette_id,
      target_url: payload.target_url,
      sender_name: payload.sender_name || null,
      recipient_name: payload.recipient_name || null,
      message: payload.message || null,
      gift_format: payload.gift_format || 'both',
      sound_preset: payload.sound_preset || null,
      audio_enabled: payload.audio_enabled ?? false,
      custom_colors: payload.custom_colors || null,
      metadata: payload.metadata || null,
      view_count: 0,
    };

    // Primary save: insert new record (succeeds 100% with fresh client shortId)
    const { error: insertError } = await supabase.from('digital_bouquets').insert([dbRecord]);

    if (insertError) {
      // If shortId already exists, update the existing record
      if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
        const { error: updateError } = await supabase
          .from('digital_bouquets')
          .update(dbRecord)
          .eq('id', shortId);
        if (updateError) {
          console.warn('Supabase bouquet update note:', updateError.message);
        }
      } else {
        console.warn('Supabase bouquet insert note (using fallback):', insertError.message);
      }
    }
  } catch (err) {
    console.warn('Failed to save bouquet to Supabase (using fallback):', err);
  }

  return shortId;
}

/**
 * Fetch a Digital Bouquet by its short code (with fallback to local storage & API).
 */
export async function getBouquetByShortId(id: string): Promise<StoredBouquet | null> {
  // 1. Check local storage if in browser
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`ck_bouquet_${id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.id) return parsed as StoredBouquet;
      }
    } catch {
      // Ignore parse errors
    }
  }

  // 2. Check Next.js local API fallback
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/bouquets?id=${encodeURIComponent(id)}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.id) return json.data as StoredBouquet;
      }
    } catch {
      // Fall through
    }
  }

  // 3. Query Supabase
  try {
    const { data, error } = await supabase
      .from('digital_bouquets')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      // Increment view count (fire-and-forget)
      supabase
        .from('digital_bouquets')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', id)
        .then(() => {});

      return data as StoredBouquet;
    }
  } catch (err) {
    console.error('Error fetching bouquet from Supabase:', err);
  }

  return null;
}



// ─────────────────────────────────────────────────────────────────────────────
// 📰 BLOG & MASTERCLASS DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface DatabasePostRow {
  id?: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  cover_image?: string;
  youtube_id?: string;
  youtube_embed_url?: string;
  instagram_url?: string;
  video_credit?: any;
  author: any;
  tags: string[];
  category: string;
  pill_color?: any;
  content: any;
  featured?: boolean;
  read_time?: string;
  views_count?: number;
  created_at?: string;
  updated_at?: string;
}

/** Converts a DB row to our standard BlogPost interface */
export function mapRowToBlogPost(row: DatabasePostRow): BlogPost {
  return {
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    excerpt: row.excerpt,
    coverImage: row.cover_image,
    youtubeId: row.youtube_id,
    youtubeEmbedUrl: row.youtube_embed_url,
    instagramUrl: row.instagram_url,
    videoCredit: row.video_credit,
    author: row.author || { name: 'CreatorsKit Research Lab', role: 'Viral Strategy' },
    tags: row.tags || [],
    category: row.category || 'General',
    pillColor: row.pill_color || { bg: '#FFE500', text: '#000000' },
    featured: !!row.featured,
    readTime: row.read_time || '5 min read',
    date: row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'August 2026',
    content: row.content || {
      whatYoullLearn: [],
      sections: [],
      actionableChecklist: [],
      relatedTools: [],
    },
  };
}

/** Converts a BlogPost object to our DB row */
export function mapBlogPostToRow(post: BlogPost): DatabasePostRow {
  return {
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle,
    excerpt: post.excerpt,
    cover_image: post.coverImage,
    youtube_id: post.youtubeId,
    youtube_embed_url: post.youtubeEmbedUrl,
    instagram_url: post.instagramUrl,
    video_credit: post.videoCredit,
    author: post.author,
    tags: post.tags,
    category: post.category,
    pill_color: post.pillColor,
    content: post.content,
    featured: post.featured,
    read_time: post.readTime,
  };
}

/**
 * Fetch all posts from Supabase. Falls back to static BLOG_POSTS if table is empty.
 */
export async function fetchPostsFromDatabase(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return BLOG_POSTS;
    }

    return data.map(mapRowToBlogPost);
  } catch (err) {
    console.warn('Error fetching posts from Supabase, using local data:', err);
    return BLOG_POSTS;
  }
}

/**
 * Fetch single post by slug from Supabase.
 */
export async function fetchPostBySlugFromDatabase(slug: string): Promise<BlogPost | null> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return BLOG_POSTS.find((p) => p.slug === slug) || null;
    }

    return mapRowToBlogPost(data);
  } catch (err) {
    return BLOG_POSTS.find((p) => p.slug === slug) || null;
  }
}

/**
 * Save / Update a post in Supabase.
 */
export async function savePostToDatabase(post: BlogPost): Promise<{ success: boolean; error?: string }> {
  try {
    const row = mapBlogPostToRow(post);
    const { error } = await supabase
      .from('posts')
      .upsert(row, { onConflict: 'slug' });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

/**
 * Delete a post from Supabase by slug.
 */
export async function deletePostFromDatabase(slug: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('slug', slug);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

/**
 * One-Click Migration: Seeds all local BLOG_POSTS into the Supabase database.
 */
export async function migrateAllLocalPostsToSupabase(): Promise<{ total: number; successCount: number; errors: string[] }> {
  const total = BLOG_POSTS.length;
  let successCount = 0;
  const errors: string[] = [];

  for (const post of BLOG_POSTS) {
    const res = await savePostToDatabase(post);
    if (res.success) {
      successCount++;
    } else {
      errors.push(`Failed to migrate "${post.title}": ${res.error}`);
    }
  }

  return { total, successCount, errors };
}

// ═══════════════════════════════════════════════════════════════
// THUMBNAIL LAB: COMPETITOR THUMBNAIL DATABASE INTEGRATION
// ═══════════════════════════════════════════════════════════════

export interface StoredCompetitor {
  id: string;
  youtube_video_id: string;
  title: string;
  channel_name: string;
  channel_avatar?: string;
  views?: string;
  time_ago?: string;
  published_at?: string;
  duration?: string;
  format?: 'longform' | 'shorts';
  category?: string;
  verified?: boolean;
  thumbnail_url?: string;
  created_at?: string;
}

// Exact minimal column projection matching the real Supabase table schema
const COMPETITOR_SELECT_COLUMNS = 'id, youtube_video_id, title, channel_name, channel_avatar, views, time_ago, duration, format, category, verified, thumbnail_url, created_at';

/**
 * Fetch competitor thumbnails from Supabase with offset pagination.
 */
export async function fetchCompetitorsFromDatabase(format?: 'longform' | 'shorts', limit: number = 25, offset: number = 0): Promise<StoredCompetitor[]> {
  try {
    const fetchLimit = Math.min(Math.max(limit, 5), 50);

    let query = supabase
      .from('competitor_thumbnails')
      .select('*')
      .range(offset, offset + fetchLimit - 1);

    if (format) {
      query = query.eq('format', format);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Supabase competitor_thumbnails query error:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data as StoredCompetitor[];
  } catch (err) {
    console.warn('Failed to fetch competitor_thumbnails from Supabase:', err);
    return [];
  }
}

/**
 * Save / Insert a competitor thumbnail into Supabase using an atomic write with fallback.
 */
export async function saveCompetitorToDatabase(competitor: Partial<StoredCompetitor>): Promise<{ success: boolean; data?: StoredCompetitor; alreadyExists?: boolean; error?: string }> {
  try {
    const rawId = competitor.youtube_video_id?.trim();
    if (!rawId) {
      return { success: false, error: 'youtube_video_id is required' };
    }

    // Extract exact 11-character unique video ID
    const videoId = rawId.length > 11 ? rawId.slice(-11) : rawId;
    const title = competitor.title || 'YouTube Video';
    const channelName = competitor.channel_name || 'YouTube Creator';
    const category = competitor.category || inferYouTubeCategory(title, channelName);
    const timeAgoOrIso = competitor.published_at || competitor.time_ago || new Date().toISOString();

    const payload = {
      youtube_video_id: videoId,
      title,
      channel_name: channelName,
      channel_avatar: competitor.channel_avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(channelName)}`,
      views: competitor.views || '1.2M views',
      time_ago: timeAgoOrIso,
      duration: competitor.duration || (competitor.format === 'shorts' ? '0:58' : '14:20'),
      format: competitor.format || 'longform',
      category,
      verified: competitor.verified ?? true,
      thumbnail_url: competitor.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    };

    // 1. Check if record already exists by youtube_video_id
    const existing = await supabase
      .from('competitor_thumbnails')
      .select('id, youtube_video_id, title, channel_name, channel_avatar, views, time_ago, duration, format, category, verified, thumbnail_url, created_at')
      .eq('youtube_video_id', videoId)
      .maybeSingle();

    if (existing.data) {
      return { success: true, alreadyExists: true, data: existing.data as StoredCompetitor };
    }

    // 2. Safe direct insert
    const insertRes = await supabase
      .from('competitor_thumbnails')
      .insert([payload])
      .select('id, youtube_video_id, title, channel_name, channel_avatar, views, time_ago, duration, format, category, verified, thumbnail_url, created_at')
      .maybeSingle();

    if (insertRes.error) {
      // 3. If standard insert had an error, attempt upsert as fallback
      const upsertRes = await supabase
        .from('competitor_thumbnails')
        .upsert([payload])
        .select('id, youtube_video_id, title, channel_name, channel_avatar, views, time_ago, duration, format, category, verified, thumbnail_url, created_at')
        .maybeSingle();

      if (upsertRes.error) {
        return { success: false, error: upsertRes.error.message };
      }
      return { success: true, data: upsertRes.data as StoredCompetitor };
    }

    return { success: true, data: insertRes.data as StoredCompetitor };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

/**
 * Migration helper: Converts any legacy relative strings (e.g. "3 days ago")
 * in Supabase into exact ISO release dates so the front-end always computes relative dates dynamically.
 */
export async function migrateCompetitorDatesToISO(): Promise<{ updatedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let updatedCount = 0;

  try {
    const { data: competitors, error } = await supabase
      .from('competitor_thumbnails')
      .select('id, youtube_video_id, time_ago, created_at');

    if (error || !competitors) {
      return { updatedCount: 0, errors: [error?.message || 'Failed to fetch competitors'] };
    }

    for (const comp of competitors) {
      if (!comp.time_ago || comp.time_ago.includes('ago')) {
        const isoDate = relativeStringToISODate(comp.time_ago || comp.created_at);
        const { error: updateError } = await supabase
          .from('competitor_thumbnails')
          .update({
            time_ago: isoDate,
          })
          .eq('id', comp.id);

        if (updateError) {
          errors.push(`Error updating ${comp.youtube_video_id}: ${updateError.message}`);
        } else {
          updatedCount++;
        }
      }
    }

    return { updatedCount, errors };
  } catch (e: any) {
    return { updatedCount, errors: [e?.message || 'Unknown error'] };
  }
}

