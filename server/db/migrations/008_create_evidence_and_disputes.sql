-- Migration 008: Evidence uploads & disputes
CREATE TYPE evidence_stage AS ENUM ('pre_ship', 'unboxing');
CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved_shop', 'resolved_renter');

CREATE TABLE IF NOT EXISTS evidence_uploads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  uploaded_by         UUID NOT NULL REFERENCES users(id),
  stage               evidence_stage NOT NULL,
  s3_keys             TEXT[] NOT NULL,      -- array of S3 object keys
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_booking ON evidence_uploads(booking_id);

CREATE TABLE IF NOT EXISTS disputes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  raised_by           UUID NOT NULL REFERENCES users(id),
  reason              TEXT NOT NULL,
  status              dispute_status NOT NULL DEFAULT 'open',
  resolution_note     TEXT,
  compensation_amount NUMERIC(10,2),
  compensated_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disputes_booking ON disputes(booking_id);
CREATE INDEX idx_disputes_status  ON disputes(status);
