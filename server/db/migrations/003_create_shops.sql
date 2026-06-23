-- Migration 003: Shops (Seller accounts)
CREATE TABLE IF NOT EXISTS shops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_name       VARCHAR(150) NOT NULL,
  description     TEXT,
  logo_url        TEXT,
  is_verified     BOOLEAN DEFAULT FALSE,
  bank_account    JSONB,           -- { bank, account_name, account_number }
  rating          NUMERIC(3,2) DEFAULT 5.00,
  total_rentals   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shops_owner ON shops(owner_id);
