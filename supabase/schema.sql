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
DROP POLICY IF EXISTS "Public read access for documents" ON receipts;
CREATE POLICY "Public read access for documents"
  ON receipts FOR SELECT
  USING (true);

-- Allow public insert so creators can save documents and get short links
DROP POLICY IF EXISTS "Public insert access for documents" ON receipts;
CREATE POLICY "Public insert access for documents"
  ON receipts FOR INSERT
  WITH CHECK (true);

-- Allow public update so creators can update documents
DROP POLICY IF EXISTS "Public update access for documents" ON receipts;
CREATE POLICY "Public update access for documents"
  ON receipts FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- =========================================================================
-- CREATORKIT: DIGITAL BOUQUETS & BOTANICAL KEEPSAKES SCHEMA
-- =========================================================================

CREATE TABLE IF NOT EXISTS digital_bouquets (
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
DROP POLICY IF EXISTS "Public read access for bouquets" ON digital_bouquets;
CREATE POLICY "Public read access for bouquets"
  ON digital_bouquets FOR SELECT
  USING (true);

-- Allow public insert so creators can save bouquets and get short links
DROP POLICY IF EXISTS "Public insert access for bouquets" ON digital_bouquets;
CREATE POLICY "Public insert access for bouquets"
  ON digital_bouquets FOR INSERT
  WITH CHECK (true);

-- Allow public update so creators can update/upsert bouquets and views can be incremented
DROP POLICY IF EXISTS "Public update access for bouquets" ON digital_bouquets;
CREATE POLICY "Public update access for bouquets"
  ON digital_bouquets FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- =========================================================================
-- CREATORKIT: DEVICE-TO-DEVICE DATA TRANSFER SCHEMA (7-day encrypted copy)
-- Mirror of supabase/migrations/20261008210000_device_transfer.sql
-- Egress guardrails: 50-live-row ceiling + ~2 MB payload cap (client-enforced)
-- =========================================================================

CREATE TABLE IF NOT EXISTS user_data_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                   -- Recovery code e.g. "CK-7XK2-9QM4" (shown once at backup)
  payload TEXT NOT NULL,                       -- base64 AES-GCM ciphertext of the transfer JSON (≤ ~2 MB)
  salt TEXT NOT NULL,                          -- base64 PBKDF2 salt (key derivation)
  iv TEXT NOT NULL,                            -- base64 AES-GCM nonce
  pin_check TEXT NOT NULL,                     -- hex sha256(PIN + salt2) — fast wrong-PIN rejection
  salt2 TEXT NOT NULL,                         -- base64 salt for the PIN verifier
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lookups are always by recovery code
CREATE INDEX IF NOT EXISTS idx_user_data_transfers_code ON user_data_transfers(code);
CREATE INDEX IF NOT EXISTS idx_user_data_transfers_expires ON user_data_transfers(expires_at);

-- Row Level Security
ALTER TABLE user_data_transfers ENABLE ROW LEVEL SECURITY;

-- Allow public insert so phone A can create a transfer (code = the secret)
DROP POLICY IF EXISTS "Public insert access for transfers" ON user_data_transfers;
CREATE POLICY "Public insert access for transfers"
  ON user_data_transfers FOR INSERT
  WITH CHECK (true);

-- Allow public read so phone B can fetch by code (payload is PIN-encrypted)
DROP POLICY IF EXISTS "Public read access for transfers" ON user_data_transfers;
CREATE POLICY "Public read access for transfers"
  ON user_data_transfers FOR SELECT
  USING (true);

-- Allow public delete ONLY of already-expired rows (lazy TTL sweep)
DROP POLICY IF EXISTS "Public delete of expired transfers" ON user_data_transfers;
CREATE POLICY "Public delete of expired transfers"
  ON user_data_transfers FOR DELETE
  USING (expires_at < now());
