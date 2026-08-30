-- Migration 030: Phase-0 manual PromptPay. The renter transfers via a PromptPay
-- QR and attaches a bank slip; an admin verifies the slip and escrows the booking
-- (no payment gateway / webhook yet). The booking stays 'pending_payment' while a
-- slip is awaiting review — the slip URL + submit time live on the booking.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS slip_url          TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS slip_submitted_at TIMESTAMPTZ;

-- Queue lookup: bookings awaiting a slip review.
CREATE INDEX IF NOT EXISTS idx_bookings_slip
  ON bookings(slip_submitted_at)
  WHERE slip_url IS NOT NULL;
