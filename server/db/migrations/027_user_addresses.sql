-- Migration 027: renter address book (Shopee-style multi-address).
-- Replaces the single users.address free-text field with structured, multiple
-- addresses per user, one of which is the default.
CREATE TABLE IF NOT EXISTS user_addresses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  phone          TEXT NOT NULL,
  province       TEXT NOT NULL,
  district       TEXT NOT NULL,
  subdistrict    TEXT NOT NULL,
  postal_code    TEXT NOT NULL,
  detail_line    TEXT NOT NULL,                 -- บ้านเลขที่/ซอย/หมู่/ถนน
  label          TEXT,                          -- บ้าน/ที่ทำงาน (optional)
  latitude       NUMERIC,
  longitude      NUMERIC,
  is_default     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON user_addresses(user_id);

-- Snapshot of the shipping address chosen at checkout (decoupled from the
-- address book so later edits/deletes don't rewrite past orders).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS shipping_address JSONB;
