-- Migration 022: shop-level rental rules (กฎของร้าน) shown on every product page.
-- Text and image are both optional (a shop may provide only an image). Stored as a
-- TEXT data-URL exactly like shops.logo_url / cover_url (migration 010).
ALTER TABLE shops ADD COLUMN IF NOT EXISTS rules_text      TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS rules_image_url TEXT;
