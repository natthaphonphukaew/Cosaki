-- Migration 018: Seller lifecycle — order acceptance, strikes, freeze/ban
-- (PRD §3.3 Action Center, §4.2 Strict SLA Logics).

-- Shop discipline fields.
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_frozen      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS frozen_until   TIMESTAMPTZ;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS freeze_count   INTEGER NOT NULL DEFAULT 0;

-- Booking acceptance (shop confirms the queue after payment).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Strikes ledger (one row per warning issued to a shop).
CREATE TABLE IF NOT EXISTS shop_strikes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  booking_id  UUID REFERENCES bookings(id) ON DELETE SET NULL,
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strikes_shop ON shop_strikes(shop_id, created_at);
