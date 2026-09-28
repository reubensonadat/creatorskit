-- =========================================================================
-- CREATORKIT: RECEIPTS & BUSINESS DOCUMENTS DATABASE SCHEMA
-- Compatible with Supabase Postgres
-- =========================================================================

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,                       -- Clean 6-character short code e.g. "k8w2ab"
  receipt_number TEXT,                       -- e.g. "INV-2026-0042", "RCP-2026-0012"
  creator_name TEXT NOT NULL,                -- Creator / agency name
  creator_email TEXT,                        -- Contact email
  creator_phone TEXT,                        -- Contact phone / WhatsApp
  client_name TEXT NOT NULL,                 -- Billed client / brand name
  currency TEXT DEFAULT 'GHS',               -- GHS, NGN, USD, GBP, EUR
  total_amount NUMERIC DEFAULT 0,            -- Grand total fee
  amount_paid NUMERIC DEFAULT 0,             -- Amount paid so far
  balance_due NUMERIC DEFAULT 0,             -- Remaining balance
  status TEXT DEFAULT 'paid',                -- 'paid', 'partial', 'pending'
  payment_channel TEXT,                      -- 'momo', 'bank', 'paystack', 'wire'
  payload_string TEXT NOT NULL,              -- Full document payload for the animated printer
  metadata JSONB DEFAULT '{}'::jsonb,        -- { kind: 'invoice'|'receipt'|'agreement'|'letterhead', templateId, etc. }
  created_at TIMESTAMPTZ DEFAULT now()       -- Timestamp
);

-- Index for instant lookup by short code
CREATE INDEX IF NOT EXISTS idx_receipts_id ON receipts(id);

-- Enable Row Level Security (RLS)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Allow public read access so clients can view their documents via short link
CREATE POLICY "Public read access for documents"
  ON receipts FOR SELECT
  USING (true);

-- Allow public insert so creators can save documents and get short links
CREATE POLICY "Public insert access for documents"
  ON receipts FOR INSERT
  WITH CHECK (true);

-- =========================================================================
-- CREATORKIT: DIGITAL BOUQUETS & BOTANICAL KEEPSAKES SCHEMA
-- =========================================================================

DROP TABLE IF EXISTS digital_bouquets CASCADE;

CREATE TABLE digital_bouquets (
  id TEXT PRIMARY KEY,                       -- Clean 6-character short code e.g. "k8w2ab"
  scene_type TEXT DEFAULT 'botanical-2d',    -- Scene render style e.g. 'botanical-2d', 'artisan-kraft'
  season TEXT DEFAULT 'spring',              -- Season palette tag
  palette_id TEXT DEFAULT 'classic-cream',   -- Visual palette ID
  target_url TEXT DEFAULT '',                -- Optional redirect/landing URL
  sender_name TEXT,                          -- Sender's name / signature
  recipient_name TEXT,                       -- Recipient's name
  message TEXT,                              -- Personal card message
  gift_format TEXT DEFAULT 'both',           -- 'both' | 'flower' | 'card'
  sound_preset TEXT DEFAULT NULL,            -- e.g. 'music-box', 'gentle-piano', 'spring-garden', 'harp-melody', etc.
  audio_enabled BOOLEAN DEFAULT true,        -- Audio toggle state
  custom_colors JSONB DEFAULT NULL,          -- Custom palette overrides
  metadata JSONB DEFAULT '{}'::jsonb,        -- { flowers, greenery, seed, cardFont, cardPlacement, greeting, closing, etc. }
  view_count INTEGER DEFAULT 0,              -- Number of times opened
  created_at TIMESTAMPTZ DEFAULT now()       -- Creation timestamp
);

-- Index for instant lookup by short code
CREATE INDEX IF NOT EXISTS idx_digital_bouquets_id ON digital_bouquets(id);

-- Enable Row Level Security (RLS)
ALTER TABLE digital_bouquets ENABLE ROW LEVEL SECURITY;

-- Allow public read access so recipients can view their gift via short link
CREATE POLICY "Public read access for bouquets"
  ON digital_bouquets FOR SELECT
  USING (true);

-- Allow public insert so creators can save bouquets and get short links
CREATE POLICY "Public insert access for bouquets"
  ON digital_bouquets FOR INSERT
  WITH CHECK (true);


