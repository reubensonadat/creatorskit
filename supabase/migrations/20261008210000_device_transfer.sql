-- =========================================================================
-- DEVICE-TO-DEVICE DATA TRANSFER (owner ruling 2026-10-08, ceilings 2026-10-08)
-- =========================================================================
-- Purpose: "I'm changing my phone but I love CreatorsKit — let me move my
-- data to a new device and continue instead of starting from scratch."
--
-- Design rules (all owner-mandated):
--   1. OPT-IN ONLY — a row exists solely when the user physically taps
--      "Back up my data" on /your-data. Nothing ever uploads automatically.
--   2. ENCRYPTED CLIENT-SIDE — the payload is AES-GCM ciphertext whose key is
--      derived (PBKDF2, 150k iterations) from a 4-digit PIN the user picks.
--      The server stores ciphertext it cannot read. A separate PIN verifier
--      (sha256(PIN + salt2)) allows fast wrong-PIN rejection.
--   3. EPHEMERAL — rows evaporate 7 days after creation. Purge is lazy:
--      anon DELETE is allowed ONLY on already-expired rows (attempted
--      restores and new backups sweep them).
--   4. NO IDENTITY — the recovery code is the only key; no accounts, no
--      profiles, no emails. Privacy policy §5 itemizes this feature.
--
-- EGRESS PROTECTION (owner ruling: sharing — bouquets, receipts, invoices —
-- must NEVER lose egress budget to this feature):
--   * Live-row ceiling: the client refuses to insert when 50 live transfers
--     exist (~100 MB worst-case DB footprint; expired rows free their slots
--     automatically). Enforced in src/lib/device-transfer.ts.
--   * Payload ceiling: ciphertext capped at ~2 MB per transfer client-side,
--     so restores are ~2 MB egress each — 5 GB free tier ≈ 2,500 restores.

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

-- Allow public insert so phone A can create a transfer (code = the secret;
-- the 50-live-row ceiling is enforced client-side before this is reached)
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
