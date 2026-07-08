-- Migration 020: Chat between renter and shop (PRD §4.2 update).
-- One conversation per renter↔shop pair; messages can attach a booking (order card).

CREATE TABLE IF NOT EXISTS conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  renter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shop_id, renter_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT,
  booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,  -- attach an order card
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_convo ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_convo_renter   ON conversations(renter_id);
CREATE INDEX IF NOT EXISTS idx_convo_shop     ON conversations(shop_id);
