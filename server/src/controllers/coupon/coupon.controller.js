const db = require('../../config/db');
const { success, error } = require('../../utils/response');

const computeDiscount = (coupon, subtotal) => {
  const val = Number(coupon.discount_value);
  const raw = coupon.discount_type === 'percent' ? (subtotal * val) / 100 : val;
  return Math.min(Number(raw.toFixed(2)), subtotal); // never exceed subtotal
};

// POST /bookings/:id/coupon  { code }  — apply (or clear with empty code) a coupon.
const applyCoupon = async (req, res, next) => {
  try {
    const code = (req.body.code || '').trim().toUpperCase();

    const { rows: bks } = await db.query(
      'SELECT * FROM bookings WHERE id = $1 AND renter_id = $2',
      [req.params.id, req.user.id]
    );
    if (!bks.length) return error(res, 'Booking not found', 404);
    const b = bks[0];
    if (!['pending_payment'].includes(b.status) || Number(b.amount_paid) > 0) {
      return error(res, 'ใช้คูปองได้เฉพาะก่อนชำระเงิน', 422);
    }

    // Clear coupon.
    if (!code) {
      const { rows } = await db.query(
        `UPDATE bookings SET discount = 0, coupon_code = NULL, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [b.id]
      );
      return success(res, { booking: rows[0], discount: 0 });
    }

    const { rows: coupons } = await db.query(
      `SELECT * FROM coupons
       WHERE code = $1 AND active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (scope = 'cosaki' OR (scope = 'shop' AND shop_id = $2))`,
      [code, b.shop_id]
    );
    if (!coupons.length) return error(res, 'คูปองไม่ถูกต้องหรือหมดอายุ', 404);
    const coupon = coupons[0];

    const subtotal = Number(b.rental_fee) + Number(b.cosaki_fee) + Number(b.shipping_fee) + Number(b.booking_fee);
    if (subtotal < Number(coupon.min_spend)) {
      return error(res, `ยอดขั้นต่ำสำหรับคูปองนี้คือ ฿${coupon.min_spend}`, 422);
    }

    const discount = computeDiscount(coupon, subtotal);
    const { rows } = await db.query(
      `UPDATE bookings SET discount = $1, coupon_code = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [discount, code, b.id]
    );
    return success(res, { booking: rows[0], discount });
  } catch (err) {
    next(err);
  }
};

module.exports = { applyCoupon };
