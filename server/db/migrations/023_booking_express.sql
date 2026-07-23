-- Migration 023: Add express delivery flag to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_express BOOLEAN DEFAULT FALSE;
