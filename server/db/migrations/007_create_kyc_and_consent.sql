-- Migration 007: KYC verifications & parent consent
CREATE TYPE kyc_provider_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE consent_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

CREATE TABLE IF NOT EXISTS kyc_verifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id_image_key    TEXT,             -- S3 key
  selfie_key      TEXT,             -- S3 key
  ocr_result      JSONB,
  provider_ref    VARCHAR(255),
  status          kyc_provider_status NOT NULL DEFAULT 'pending',
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kyc_user ON kyc_verifications(user_id);

CREATE TABLE IF NOT EXISTS parent_consents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  minor_user_id   UUID NOT NULL REFERENCES users(id),
  parent_phone    VARCHAR(20) NOT NULL,
  consent_token   VARCHAR(64) UNIQUE NOT NULL,
  status          consent_status NOT NULL DEFAULT 'pending',
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_booking ON parent_consents(booking_id);
CREATE INDEX idx_consent_token   ON parent_consents(consent_token);
