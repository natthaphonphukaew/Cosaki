-- Migration 002: OTP codes for phone verification
CREATE TABLE IF NOT EXISTS otp_codes (
  phone       VARCHAR(20) PRIMARY KEY,
  code        VARCHAR(6) NOT NULL,
  attempts    SMALLINT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
