export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface StoredBouquetItem {
  id: string;
  sender_name?: string;
  recipient_name?: string;
  message?: string;
  gift_format?: string;
  sound_preset?: string | null;
  scene_type?: string;
  season?: string;
  palette_id?: string;
  target_url?: string;
  audio_enabled?: boolean;
  metadata?: any;
  view_count?: number;
  created_at: string;
}

// In-memory cache for Edge isolates
const memoryBouquets = new Map<string, StoredBouquetItem>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing bouquet id' }, { status: 400 });
  }

  let bouquet = memoryBouquets.get(id);

  if (!bouquet) {
    try {
      const { data, error } = await supabase
        .from('digital_bouquets')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        bouquet = data as StoredBouquetItem;
        memoryBouquets.set(id, bouquet);
      }
    } catch {
      // Ignore network errors
    }
  }

  if (!bouquet) {
    return NextResponse.json({ error: 'Bouquet not found' }, { status: 404 });
  }

  return NextResponse.json({ data: bouquet });
}

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    // Clean 6-character short code (e.g. "k8w2ab")
    const id = body.id || Math.random().toString(36).substring(2, 8);

    const bouquet: StoredBouquetItem = {
      id,
      sender_name: body.senderName || body.sender_name || 'A Friend',
      recipient_name: body.recipientName || body.recipient_name || 'Someone Special',
      message: body.message || '',
      gift_format: body.giftFormat || body.gift_format || 'both',
      sound_preset: body.soundPreset || body.sound_preset || body.metadata?.soundPreset || null,
      scene_type: body.sceneType || body.scene_type || 'botanical-2d',
      season: body.season || 'spring',
      palette_id: body.paletteId || body.palette_id || 'classic-cream',
      target_url: body.targetUrl || body.target_url || '',
      audio_enabled: body.audioEnabled ?? body.audio_enabled ?? false,
      metadata: body.metadata || {},
      view_count: 0,
      created_at: new Date().toISOString(),
    };

    memoryBouquets.set(id, bouquet);

    // Also persist to Supabase if not already saved
    try {
      await supabase.from('digital_bouquets').insert([bouquet]);
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, id, data: bouquet });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save bouquet' }, { status: 500 });
  }
}
