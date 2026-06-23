-- Migration 005: Bookings — the central state machine
CREATE TYPE booking_status AS ENUM (
  'draft',
  'pending_kyc',
  'pending_payment',
  'escrowed',
  'shipped',
  'returned',
  'disputed',
  'completed',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             UUID NOT NULL REFERENCES shops(id),
  renter_id           UUID NOT NULL REFERENCES users(id),
  item_id             UUID NOT NULL REFERENCES items(id),
  rental_start        DATE NOT NULL,
  rental_end          DATE NOT NULL,
  status              booking_status NOT NULL DEFAULT 'draft',
  payment_link_token  VARCHAR(64) UNIQUE,
  rental_fee          NUMERIC(10,2) NOT NULL,
  deposit_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_fee        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(10,2) GENERATED ALWAYS AS (rental_fee + deposit_amount + shipping_fee) STORED,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_overlap CHECK (rental_start < rental_end)
);

CREATE INDEX idx_bookings_shop    ON bookings(shop_id);
CREATE INDEX idx_bookings_renter  ON bookings(renter_id);
CREATE INDEX idx_bookings_item    ON bookings(item_id);
CREATE INDEX idx_bookings_status  ON bookings(status);
CREATE INDEX idx_bookings_token   ON bookings(payment_link_token);
