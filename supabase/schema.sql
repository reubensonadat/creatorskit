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
