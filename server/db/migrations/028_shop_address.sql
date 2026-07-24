-- Migration 028: structured shop address (same shape as the renter address book),
-- stored as JSONB like shops.bank_account.
--   {province, district, subdistrict, postal_code, detail, latitude, longitude}
ALTER TABLE shops ADD COLUMN IF NOT EXISTS shop_address JSONB;
