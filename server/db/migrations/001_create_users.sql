-- Migration 001: Core users table
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('renter', 'shop_admin', 'admin');
CREATE TYPE kyc_status AS ENUM ('none', 'pending', 'verified', 'frozen');

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         VARCHAR(20) UNIQUE,
  email         VARCHAR(255) UNIQUE,
  google_id     VARCHAR(255) UNIQUE,
  facebook_id   VARCHAR(255) UNIQUE,
  display_name  VARCHAR(100),
  avatar_url    TEXT,
  role          user_role NOT NULL DEFAULT 'renter',
  kyc_status    kyc_status NOT NULL DEFAULT 'none',
  trust_score   NUMERIC(3,2) DEFAULT 5.00,
  is_minor      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone    ON users(phone);
CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_role     ON users(role);
