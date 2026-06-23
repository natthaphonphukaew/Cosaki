-- Migration 004: Costume items listed by shops
CREATE TABLE IF NOT EXISTS items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  character       VARCHAR(100),
  fandom          VARCHAR(100),
  sizes           TEXT[],          -- e.g. ARRAY['S','M','L']
  daily_rate      NUMERIC(10,2) NOT NULL,
  deposit_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_urls      TEXT[],
  is_available    BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_items_shop     ON items(shop_id);
CREATE INDEX idx_items_fandom   ON items(fandom);
CREATE INDEX idx_items_available ON items(is_available);
