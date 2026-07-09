-- Migration 021: Fandom onboarding (§1.3) + real shop follows (§2.3).

ALTER TABLE users ADD COLUMN IF NOT EXISTS fandoms TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS shop_follows (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, shop_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_shop ON shop_follows(shop_id);
