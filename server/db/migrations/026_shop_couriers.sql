-- Migration 026: shop-level courier preferences shown on the shop profile.
--   ship_couriers   — couriers the shop uses to deliver to the renter
--   return_couriers — couriers the shop accepts for the renter's return shipment
-- Mirrors the shops.categories TEXT[] pattern (migration 010).
ALTER TABLE shops ADD COLUMN IF NOT EXISTS ship_couriers   TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS return_couriers TEXT[] NOT NULL DEFAULT '{}';
