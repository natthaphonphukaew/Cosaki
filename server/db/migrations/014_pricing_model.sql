-- Migration 014: Money model per PRD §4.1 — two rates, Cosaki fee + commission,
-- seller payout, platform revenue/insurance ledger; deposit removed from the flow.

-- ── Items: two rental rates + per-item shipping ───────────────────────────────
ALTER TABLE items ADD COLUMN IF NOT EXISTS test_rate     NUMERIC(10,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS private_rate  NUMERIC(10,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS shipping_fee  NUMERIC(10,2) DEFAULT 0;

-- Backfill existing items from the legacy single rate.
UPDATE items SET test_rate    = daily_rate WHERE test_rate    IS NULL;
UPDATE items SET private_rate = daily_rate WHERE private_rate IS NULL;

-- ── Bookings: money breakdown ─────────────────────────────────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rate_type     VARCHAR(10) DEFAULT 'test';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cosaki_fee    NUMERIC(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission    NUMERIC(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS seller_payout NUMERIC(10,2) DEFAULT 0;

-- Backfill money fields for existing bookings (10% each side).
UPDATE bookings
   SET cosaki_fee    = ROUND(rental_fee * 0.10, 2),
       commission    = ROUND(rental_fee * 0.10, 2),
       seller_payout = rental_fee - ROUND(rental_fee * 0.10, 2)
 WHERE seller_payout = 0;

-- Redefine total_amount: drop the deposit-based generated column, recreate it
-- as rental + Cosaki protection fee + shipping (no deposit, no booking fee here).
ALTER TABLE bookings DROP COLUMN IF EXISTS total_amount;
ALTER TABLE bookings
  ADD COLUMN total_amount NUMERIC(10,2)
  GENERATED ALWAYS AS (rental_fee + cosaki_fee + shipping_fee) STORED;

-- ── Platform ledger: revenue (commission) + insurance fund (protection fee) ────
CREATE TABLE IF NOT EXISTS platform_ledger (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  revenue_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  insurance_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_ledger_booking ON platform_ledger(booking_id);
