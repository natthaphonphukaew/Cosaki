-- Migration 010: Extra shop profile fields (cover photo, location, categories)
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS cover_url   TEXT,
  ADD COLUMN IF NOT EXISTS location    VARCHAR(120),
  ADD COLUMN IF NOT EXISTS categories  TEXT[] DEFAULT '{}';
