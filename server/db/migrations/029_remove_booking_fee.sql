-- Migration 029: Drop the ฿100 booking fee entirely, and pass the shipping fee
-- through to the shop's payout (Cosaki isn't integrated with couriers — the shop
-- ships the item itself). New money model:
--   customer total = rental_fee + cosaki_fee (protection) + shipping_fee − discount
--   shop payout    = rental_fee − 10% commission + shipping_fee
-- Money balances: customer 409 = shop 349 + platform 60 (commission 30 + insurance 30).

-- total_amount is a generated column that referenced booking_fee — drop it, drop
-- the booking_fee column, then recreate total_amount without the fee.
ALTER TABLE bookings DROP COLUMN IF EXISTS total_amount;
ALTER TABLE bookings DROP COLUMN IF EXISTS booking_fee;
ALTER TABLE bookings
  ADD COLUMN total_amount NUMERIC(10,2)
  GENERATED ALWAYS AS (rental_fee + cosaki_fee + shipping_fee - discount) STORED;

-- Recompute payout for all existing rows to include the pass-through shipping fee.
UPDATE bookings
   SET seller_payout = ROUND(rental_fee - ROUND(rental_fee * 0.10, 2) + COALESCE(shipping_fee, 0), 2);

-- Reconcile already-paid bookings to the new (lower) total so no stale balance shows.
UPDATE bookings
   SET amount_paid = total_amount, balance_due = 0
 WHERE amount_paid > total_amount;
