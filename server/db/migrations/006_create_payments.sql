-- Migration 006: Payments / Escrow ledger
CREATE TYPE escrow_status AS ENUM (
  'held',
  'released_to_shop',
  'refunded',
  'compensated'
);

CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  gateway_ref     VARCHAR(255),       -- Omise / Stripe charge ID
  amount          NUMERIC(10,2) NOT NULL,
  currency        VARCHAR(3) NOT NULL DEFAULT 'THB',
  escrow_status   escrow_status NOT NULL DEFAULT 'held',
  paid_at         TIMESTAMPTZ,
  released_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
