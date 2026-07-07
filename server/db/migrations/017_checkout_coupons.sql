-- Migration 017: Checkout — ฿100 booking fee, coupons/discount, split payment,
-- reschedule flag (PRD §2.4, §5.2).

-- Booking-fee (จองคิว), coupon discount, split-payment tracking.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_fee     NUMERIC(10,2) NOT NULL DEFAULT 0;  -- new rows set 100
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount        NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_code     VARCHAR(40);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pay_mode        VARCHAR(10) NOT NULL DEFAULT 'full'; -- full | deposit
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount_paid     NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS balance_due     NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_used BOOLEAN NOT NULL DEFAULT FALSE;

-- total = rental + Cosaki fee + shipping + booking fee − discount.
ALTER TABLE bookings DROP COLUMN IF EXISTS total_amount;
ALTER TABLE bookings
  ADD COLUMN total_amount NUMERIC(10,2)
  GENERATED ALWAYS AS (rental_fee + cosaki_fee + shipping_fee + booking_fee - discount) STORED;

-- ── Coupons (Cosaki-central or shop-scoped) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           VARCHAR(40) UNIQUE NOT NULL,
  scope          VARCHAR(10) NOT NULL DEFAULT 'cosaki',   -- cosaki | shop
  shop_id        UUID REFERENCES shops(id) ON DELETE CASCADE,
  discount_type  VARCHAR(10) NOT NULL DEFAULT 'percent',  -- percent | fixed
  discount_value NUMERIC(10,2) NOT NULL,
  min_spend      NUMERIC(10,2) NOT NULL DEFAULT 0,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed a couple of Cosaki-central coupons for testing.
INSERT INTO coupons (code, scope, discount_type, discount_value, min_spend)
VALUES ('COSAKI10', 'cosaki', 'percent', 10, 0),
       ('WELCOME50', 'cosaki', 'fixed', 50, 200)
ON CONFLICT (code) DO NOTHING;
