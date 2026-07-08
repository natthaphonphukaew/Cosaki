-- Migration 019: Finance & marketing tools (PRD §3.4).
-- Penalty bills (ร้านออกบิลค่าปรับเรียกเก็บจากลูกค้า) + shop campaign coupons.

CREATE TABLE IF NOT EXISTS penalty_bills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  renter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reason      TEXT NOT NULL,
  status      VARCHAR(10) NOT NULL DEFAULT 'pending',   -- pending | paid | waived
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bills_renter ON penalty_bills(renter_id, status);
CREATE INDEX IF NOT EXISTS idx_bills_shop   ON penalty_bills(shop_id);
