const db = require('../../config/db');
const { success } = require('../../utils/response');

// GET /admin/queue — the Phase-0 back-office work list. Two piles:
//   awaiting_slip   → renter attached a slip, waiting for the admin to verify → escrow
//   awaiting_payout → item returned, funds still held, waiting for the manual payout
const getQueue = async (req, res, next) => {
  try {
    const { rows: awaiting_slip } = await db.query(
      `SELECT b.id, b.total_amount, b.slip_url, b.slip_submitted_at,
              b.rental_start, b.rental_end,
              i.name AS item_name, s.shop_name, u.display_name AS renter_name
       FROM bookings b
       JOIN items i ON i.id = b.item_id
       JOIN shops s ON s.id = b.shop_id
       JOIN users u ON u.id = b.renter_id
       WHERE b.status = 'pending_payment' AND b.slip_url IS NOT NULL
       ORDER BY b.slip_submitted_at ASC`
    );

    const { rows: awaiting_payout } = await db.query(
      `SELECT b.id AS booking_id, p.id AS payment_id,
              b.seller_payout, b.total_amount, b.rental_end,
              i.name AS item_name, s.shop_name, s.bank_account,
              u.display_name AS renter_name
       FROM bookings b
       JOIN payments p ON p.booking_id = b.id AND p.escrow_status = 'held'
       JOIN items i ON i.id = b.item_id
       JOIN shops s ON s.id = b.shop_id
       JOIN users u ON u.id = b.renter_id
       WHERE b.status = 'returned'
       ORDER BY b.updated_at ASC`
    );

    return success(res, { awaiting_slip, awaiting_payout });
  } catch (err) {
    next(err);
  }
};

module.exports = { getQueue };
