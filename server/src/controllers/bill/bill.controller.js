const db = require('../../config/db');
const { success, error } = require('../../utils/response');
const { notify, shopOwnerId } = require('../../services/notification/notification.service');

// POST /bookings/:id/bill — shop generates a penalty bill for the renter (§3.4).
const createBill = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0) return error(res, 'ระบุจำนวนเงินที่ถูกต้อง', 422);
    if (!reason?.trim()) return error(res, 'ระบุเหตุผลการเรียกเก็บ', 422);

    const { rows: bks } = await db.query(
      `SELECT b.*, s.owner_id AS shop_owner_id FROM bookings b
       JOIN shops s ON s.id = b.shop_id WHERE b.id = $1`,
      [req.params.id]
    );
    if (!bks.length) return error(res, 'Booking not found', 404);
    const booking = bks[0];
    if (booking.shop_owner_id !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Forbidden', 403);
    }
    if (['draft', 'pending_kyc', 'pending_payment', 'cancelled'].includes(booking.status)) {
      return error(res, 'ออกบิลได้เฉพาะออเดอร์ที่กำลังเช่าหรือจบแล้ว', 422);
    }

    const { rows } = await db.query(
      `INSERT INTO penalty_bills (booking_id, shop_id, renter_id, amount, reason)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [booking.id, booking.shop_id, booking.renter_id, amt.toFixed(2), reason.trim()]
    );

    await notify(booking.renter_id, 'bill', 'มีบิลค่าปรับใหม่',
      `ร้านเรียกเก็บ ฿${amt.toFixed(2)} — ${reason.trim()}`, booking.id);

    return success(res, { bill: rows[0] }, 201);
  } catch (err) {
    next(err);
  }
};

// GET /bills — bills addressed to me (renter), or my shop's issued bills (?as=shop).
const listBills = async (req, res, next) => {
  try {
    const asShop = req.query.as === 'shop';
    const { rows } = await db.query(
      asShop
        ? `SELECT pb.*, i.name AS item_name, u.display_name AS renter_name
           FROM penalty_bills pb
           JOIN shops s ON s.id = pb.shop_id
           JOIN bookings b ON b.id = pb.booking_id
           JOIN items i ON i.id = b.item_id
           JOIN users u ON u.id = pb.renter_id
           WHERE s.owner_id = $1 ORDER BY pb.created_at DESC`
        : `SELECT pb.*, i.name AS item_name, s.shop_name
           FROM penalty_bills pb
           JOIN bookings b ON b.id = pb.booking_id
           JOIN items i ON i.id = b.item_id
           JOIN shops s ON s.id = pb.shop_id
           WHERE pb.renter_id = $1 ORDER BY pb.created_at DESC`,
      [req.user.id]
    );
    return success(res, { bills: rows });
  } catch (err) {
    next(err);
  }
};

// POST /bills/:id/pay — renter pays the bill (mock charge).
const payBill = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `UPDATE penalty_bills SET status = 'paid', paid_at = NOW()
       WHERE id = $1 AND renter_id = $2 AND status = 'pending'
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return error(res, 'ไม่พบบิลหรือชำระไปแล้ว', 404);
    const bill = rows[0];

    const ownerId = await shopOwnerId(bill.shop_id);
    await notify(ownerId, 'bill', 'ลูกค้าชำระบิลค่าปรับแล้ว',
      `ได้รับ ฿${Number(bill.amount).toFixed(2)} — เข้ายอด Wallet ของร้าน`, bill.booking_id);

    return success(res, { bill });
  } catch (err) {
    next(err);
  }
};

module.exports = { createBill, listBills, payBill };
