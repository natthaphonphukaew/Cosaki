-- Migration 024: Add express_delivery to items
ALTER TABLE items ADD COLUMN IF NOT EXISTS express_delivery BOOLEAN DEFAULT TRUE;
