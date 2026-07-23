const db = require('../../config/db');
const { success, error } = require('../../utils/response');

const computeDiscount = (coupon, subtotal) => {
  const val = Number(coupon.discount_value);
  const raw = coupon.discount_type === 'percent' ? (subtotal * val) / 100 : val;
  let final = Math.min(Number(raw.toFixed(2)), subtotal); // never exceed subtotal
  if (coupon.max_discount && final > Number(coupon.max_discount)) {
    final = Number(coupon.max_discount);
  }
  return final;
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

    // Check one-time use per user
    const { rows: used } = await db.query(
      `SELECT id FROM bookings WHERE renter_id = $1 AND coupon_code = $2 AND id != $3 AND status NOT IN ('pending_payment', 'cancelled')`,
      [req.user.id, code, b.id]
    );
    if (used.length > 0) {
      return error(res, 'คูปองนี้ถูกคุณใช้งานไปแล้ว', 422);
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

// ── Shop Campaign Builder (§3.4) ──────────────────────────────────────────────

const getShopId = async (userId) => {
  const { rows } = await db.query('SELECT id FROM shops WHERE owner_id = $1', [userId]);
  return rows[0]?.id || null;
};

// POST /shops/me/coupons — shop creates its own campaign coupon.
const createShopCoupon = async (req, res, next) => {
  try {
    const shopId = await getShopId(req.user.id);
    if (!shopId) return error(res, 'Shop not found', 404);

    const { code, discount_type = 'percent', discount_value, min_spend = 0, expires_at } = req.body;
    const cleanCode = (code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(cleanCode)) return error(res, 'โค้ดต้องเป็น A-Z/0-9 ยาว 3-20 ตัว', 422);
    const val = Number(discount_value);
    if (!val || val <= 0) return error(res, 'ระบุมูลค่าส่วนลด', 422);
    if (discount_type === 'percent' && val > 90) return error(res, 'ส่วนลดสูงสุด 90%', 422);

    const { rows } = await db.query(
      `INSERT INTO coupons (code, scope, shop_id, discount_type, discount_value, min_spend, expires_at)
       VALUES ($1, 'shop', $2, $3, $4, $5, $6) RETURNING *`,
      [cleanCode, shopId, discount_type, val, Number(min_spend) || 0, expires_at || null]
    );
    return success(res, { coupon: rows[0] }, 201);
  } catch (err) {
    if (err.code === '23505') return error(res, 'โค้ดนี้ถูกใช้แล้ว เลือกโค้ดอื่น', 409);
    next(err);
  }
};

// GET /shops/me/coupons — list the shop's campaigns.
const listShopCoupons = async (req, res, next) => {
  try {
    const shopId = await getShopId(req.user.id);
    if (!shopId) return error(res, 'Shop not found', 404);
    const { rows } = await db.query(
      `SELECT c.*,
              (SELECT COUNT(*)::int FROM bookings b WHERE b.coupon_code = c.code) AS used_count
       FROM coupons c WHERE c.shop_id = $1 ORDER BY c.created_at DESC`,
      [shopId]
    );
    return success(res, { coupons: rows });
  } catch (err) {
    next(err);
  }
};

// PATCH /shops/me/coupons/:id — toggle active on/off.
const toggleShopCoupon = async (req, res, next) => {
  try {
    const shopId = await getShopId(req.user.id);
    if (!shopId) return error(res, 'Shop not found', 404);
    const { rows } = await db.query(
      `UPDATE coupons SET active = NOT active WHERE id = $1 AND shop_id = $2 RETURNING *`,
      [req.params.id, shopId]
    );
    if (!rows.length) return error(res, 'Coupon not found', 404);
    return success(res, { coupon: rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /users/me/coupons — list user's available and used coupons.
const getMyCoupons = async (req, res, next) => {
  try {
    // Get all active global coupons
    const { rows: allCoupons } = await db.query(
      `SELECT * FROM coupons WHERE scope = 'cosaki' AND active = TRUE ORDER BY created_at DESC`
    );

    // Get coupons used by this user
    const { rows: used } = await db.query(
      `SELECT DISTINCT coupon_code FROM bookings WHERE renter_id = $1 AND coupon_code IS NOT NULL AND status NOT IN ('pending_payment', 'cancelled')`,
      [req.user.id]
    );
    const usedCodes = new Set(used.map(r => r.coupon_code));

    const available = [];
    const usedCoupons = [];
    
    for (const c of allCoupons) {
      if (usedCodes.has(c.code)) {
        usedCoupons.push(c);
      } else {
        available.push(c);
      }
    }

    return success(res, { available, used: usedCoupons });
  } catch (err) {
    next(err);
  }
};

module.exports = { applyCoupon, createShopCoupon, listShopCoupons, toggleShopCoupon, getMyCoupons };
