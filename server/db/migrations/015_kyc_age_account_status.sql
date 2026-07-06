-- Migration 015: e-KYC age gating, parental consent (account-level), account
-- status, renter profile defaults (PRD §1.1, §1.2, §2.6, §5.1).

-- ── Account status ────────────────────────────────────────────────────────────
CREATE TYPE account_status AS ENUM ('normal', 'pending_parent', 'watchlist', 'banned');

ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth  DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS real_name      VARCHAR(200);      -- locked, matches ID
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status account_status NOT NULL DEFAULT 'normal';
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_approved BOOLEAN NOT NULL DEFAULT FALSE;
-- Renter profile defaults (§2.6)
ALTER TABLE users ADD COLUMN IF NOT EXISTS address  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bust     INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS waist    INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hip      INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS height   INTEGER;

-- ── Item minimum-age restriction (§2.2.8 / §5.1): 0=none, else 15/18/20 ────────
ALTER TABLE items ADD COLUMN IF NOT EXISTS min_age INTEGER NOT NULL DEFAULT 0;

-- ── Parent consents: allow account-level (no booking) ─────────────────────────
ALTER TABLE parent_consents ALTER COLUMN booking_id DROP NOT NULL;
