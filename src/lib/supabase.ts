import { createClient } from '@supabase/supabase-js';
import { BLOG_POSTS, type BlogPost } from '@/data/blog-posts';

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
 * Save a receipt to Supabase and return the short code for branded share links.
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

  try {
    const { error } = await supabase.from('receipts').insert([
      {
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
      },
    ]);

    if (error) {
      console.warn('Supabase insert error (falling back to direct payload link):', error.message);
      return '';
    }

    return shortId;
  } catch (err) {
    console.warn('Failed to save receipt to Supabase:', err);
    return '';
  }
}

/**
 * Fetch a receipt by its short code.
 */
export async function getReceiptByShortId(id: string): Promise<StoredReceipt | null> {
  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return data as StoredReceipt;
  } catch (err) {
    console.error('Error fetching receipt from Supabase:', err);
    return null;
  }
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
    author: row.author || { name: 'CreatorKit Research Lab', role: 'Viral Strategy' },
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
