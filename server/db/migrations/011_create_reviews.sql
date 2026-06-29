-- Migration 011: Reviews & Ratings (renter → shop, one per completed booking)
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  shop_id     UUID NOT NULL REFERENCES shops(id)  ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES items(id)  ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  tags        TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_shop ON reviews(shop_id);

-- Cached aggregate so item/shop listings can show review count cheaply.
ALTER TABLE shops ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
