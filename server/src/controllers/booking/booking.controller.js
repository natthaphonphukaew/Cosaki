const { randomBytes } = require('crypto');
const db = require('../../config/db');
const { success, error } = require('../../utils/response');
const { notify, shopOwnerId } = require('../../services/notification/notification.service');
const { ageFromDob, canRentAge } = require('../../utils/age');
const { ensureShopActive } = require('../../services/strike/strike.service');

const generateToken = () => randomBytes(32).toString('hex');

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_TRANSITIONS = {
  draft:           ['pending_kyc', 'cancelled'],
  pending_kyc:     ['pending_payment', 'cancelled'],
  pending_payment: ['escrowed', 'cancelled'],
  escrowed:        ['shipped', 'disputed', 'cancelled'],
  shipped:         ['returned', 'disputed'],
  returned:        ['completed', 'disputed'],
  disputed:        [],
  completed:       [],
  cancelled:       [],
};

const canTransition = (from, to) => VALID_TRANSITIONS[from]?.includes(to) ?? false;

// ── Controllers ───────────────────────────────────────────────────────────────

// POST /bookings — renter initiates booking
const createBooking = async (req, res, next) => {
  try {
    const { item_id, rental_start, rental_end, notes, rate_type = 'test', is_express = false } = req.body;

    // Fetch item + shop info
    const { rows: items } = await db.query(
      'SELECT * FROM items WHERE id = $1 AND is_available = TRUE',
      [item_id]
    );
    if (!items.length) return error(res, 'Item not found or unavailable', 404);
    const item = items[0];

    // Shop must not be frozen (§4.2.3).
    const shop = await ensureShopActive(item.shop_id);
    if (shop?.is_frozen) return error(res, 'ร้านนี้ถูกระงับชั่วคราว ไม่สามารถเช่าได้', 403);

    // ── Age & account-status gating (PRD §1.2, §5.1) ──────────────────────────
    const { rows: [renter] } = await db.query(
      `SELECT date_of_birth, is_minor, parent_approved, account_status
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (renter?.account_status === 'banned') {
      return error(res, 'บัญชีถูกระงับการใช้งาน', 403);
    }
    if (renter?.account_status === 'watchlist') {
      return error(res, 'บัญชีอยู่ระหว่างเฝ้าระวัง — ต้องชดใช้ค่าเสียหายก่อนจึงจะเช่าได้', 403);
    }
    const gate = canRentAge(
      { age: ageFromDob(renter?.date_of_birth), isMinor: !!renter?.is_minor, parentApproved: !!renter?.parent_approved },
      item.min_age
    );
    if (!gate.ok) return error(res, gate.reason, 403);

    // Check calendar conflicts
    const { rows: conflicts } = await db.query(
      `SELECT id FROM bookings
       WHERE item_id = $1
         AND status NOT IN ('cancelled', 'completed')
         AND rental_start < $3 AND rental_end > $2`,
      [item_id, rental_start, rental_end]
    );
    if (conflicts.length) return error(res, 'Item is already booked for those dates', 409);

    // Rental spans 1 usage day + up to 2 return days = a 3-calendar-day block
    // (§2.4). The price is flat per usage, so we MUST cap the span server-side —
    // the 3-day lock in SelectDates is UI-only and can be bypassed via the API.
    const days = Math.ceil(
      (new Date(rental_end) - new Date(rental_start)) / (1000 * 60 * 60 * 24)
    );
    if (days < 1 || days > 3) {
      return error(res, 'ช่วงวันเช่าต้องอยู่ภายใน 3 วัน (ใช้งาน 1 วัน + ส่งคืน)', 422);
    }

    // Money model (PRD §4.1): renter pays rental + 10% protection fee + shipping;
    // seller receives rental − 10% commission. No deposit. Rate is flat per usage.
    const rate = rate_type === 'private'
      ? (item.private_rate ?? item.test_rate ?? item.daily_rate)
      : (item.test_rate ?? item.daily_rate);
    const rental_fee    = parseFloat(Number(rate).toFixed(2));
    const cosaki_fee    = parseFloat((rental_fee * 0.10).toFixed(2));   // → insurance fund
    const commission    = parseFloat((rental_fee * 0.10).toFixed(2));   // → platform revenue
    const seller_payout = parseFloat((rental_fee - commission).toFixed(2));
    // Express is only free if the ITEM actually offers it — never trust the
    // client flag alone, or any booking could claim free shipping.
    const express       = Boolean(is_express) && item.express_delivery === true;
    const shipping_fee  = express ? 0 : parseFloat(Number(item.shipping_fee || 0).toFixed(2));
    const token = generateToken();

    // Determine initial status based on renter's KYC
    const { rows: [user] } = await db.query('SELECT kyc_status FROM users WHERE id = $1', [req.user.id]);
    const initialStatus = user.kyc_status === 'verified' ? 'pending_payment' : 'pending_kyc';

    const booking_fee = 100;  // ค่าจองคิว (§5.2) — non-refundable, part of total.
    const { rows } = await db.query(
      `INSERT INTO bookings
         (shop_id, renter_id, item_id, rental_start, rental_end, status,
          payment_link_token, rate_type, rental_fee, cosaki_fee, commission,
          seller_payout, shipping_fee, booking_fee, deposit_amount, notes, is_express)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,0,$15,$16)
       RETURNING *`,
      [
        item.shop_id, req.user.id, item_id,
        rental_start, rental_end, initialStatus,
        token, rate_type, rental_fee, cosaki_fee, commission,
        seller_payout, shipping_fee, booking_fee, notes || null,
        express
      ]
    );

    // Notify the shop owner of the new booking request.
    const ownerId = await shopOwnerId(item.shop_id);
    await notify(ownerId, 'booking_new', 'New booking request',
      `Someone wants to rent "${item.name}".`, rows[0].id);

    return success(res, { booking: rows[0] }, 201);
  } catch (err) {
    next(err);
  }
};

// GET /bookings — list bookings from an explicit perspective.
//   ?as=renter → bookings I made as a buyer (b.renter_id = me)
//   ?as=shop   → orders for my shop      (s.owner_id  = me)
// A dual-mode user (a shop owner who also rents) MUST pass `as` to disambiguate.
// When omitted, fall back to role: shop_admin → shop view, otherwise renter view.
const listBookings = async (req, res, next) => {
  try {
    const { status, as, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const perspective = as === 'shop' || as === 'renter'
      ? as
      : (req.user.role === 'shop_admin' ? 'shop' : 'renter');

    const conditions = [perspective === 'shop' ? 's.owner_id = $1' : 'b.renter_id = $1'];
    const params = [req.user.id];

    if (status) {
      params.push(status);
      conditions.push(`b.status = $${params.length}`);
    }

    params.push(Number(limit), offset);

    const { rows } = await db.query(
      `SELECT b.*, i.name AS item_name, i.image_urls, s.shop_name,
              u.display_name AS renter_name, u.trust_score AS renter_trust_score
       FROM bookings b
       JOIN shops s ON s.id = b.shop_id
       JOIN items i ON i.id = b.item_id
       JOIN users u ON u.id = b.renter_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY b.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return success(res, { bookings: rows });
  } catch (err) {
    next(err);
  }
};

// GET /bookings/:id
const getBooking = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*, i.name AS item_name, i.image_urls, i.daily_rate,
              s.shop_name, u.display_name AS renter_name, u.phone AS renter_phone,
              u.trust_score AS renter_trust_score
       FROM bookings b
       JOIN items i ON i.id = b.item_id
       JOIN shops s ON s.id = b.shop_id
       JOIN users u ON u.id = b.renter_id
       WHERE b.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Booking not found', 404);

    const booking = rows[0];
    // Only renter or shop owner can view
    const isOwner = await isBookingOwner(req.user, booking);
    if (!isOwner) return error(res, 'Forbidden', 403);

    return success(res, { booking });
  } catch (err) {
    next(err);
  }
};

// PATCH /bookings/:id/status — advance the state machine
const updateStatus = async (req, res, next) => {
  try {
    const { status: newStatus } = req.body;
    const { rows } = await db.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (!rows.length) return error(res, 'Booking not found', 404);

    const booking = rows[0];
    const isOwner = await isBookingOwner(req.user, booking);
    if (!isOwner) return error(res, 'Forbidden', 403);

    if (!canTransition(booking.status, newStatus)) {
      return error(res, `Cannot transition from '${booking.status}' to '${newStatus}'`, 422);
    }
    // Shop must accept the queue before it can ship (§3.3 / §2.4 webhook).
    if (newStatus === 'shipped' && !booking.accepted_at) {
      return error(res, 'ต้องกด "รับคิว" ก่อนจัดส่ง', 422);
    }

    const { rows: updated } = await db.query(
      `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newStatus, booking.id]
    );

    // On completion, release the escrowed funds to the shop (real earnings)
    // and record the platform's cut: commission → revenue, protection fee → insurance.
    if (newStatus === 'completed') {
      await db.query(
        `UPDATE payments SET escrow_status = 'released_to_shop', released_at = NOW()
         WHERE booking_id = $1 AND escrow_status = 'held'`,
        [booking.id]
      );
      await db.query(
        `INSERT INTO platform_ledger (booking_id, revenue_amount, insurance_amount)
         VALUES ($1, $2, $3)`,
        [booking.id, booking.commission || 0, booking.cosaki_fee || 0]
      );
    }

    // Notify the relevant party about the status change.
    const ownerId = await shopOwnerId(booking.shop_id);
    const NOTICE = {
      shipped:   [booking.renter_id, 'shipped',   'Your rental shipped', 'The shop has shipped your costume.'],
      returned:  [ownerId,           'returned',  'Item returned',       'The renter marked the item as returned.'],
      completed: [booking.renter_id, 'completed', 'Rental completed',    'Your rental is complete — leave a review!'],
    };
    if (NOTICE[newStatus]) {
      const [uid, type, title, body] = NOTICE[newStatus];
      await notify(uid, type, title, body, booking.id);
    }

    return success(res, { booking: updated[0] });
  } catch (err) {
    next(err);
  }
};

// GET /bookings/by-token/:token — shop creates payment link, renter opens it
const getByToken = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*, i.name AS item_name, i.image_urls, i.daily_rate,
              s.shop_name, s.logo_url
       FROM bookings b
       JOIN items i ON i.id = b.item_id
       JOIN shops s ON s.id = b.shop_id
       WHERE b.payment_link_token = $1`,
      [req.params.token]
    );
    if (!rows.length) return error(res, 'Invalid payment link', 404);
    return success(res, { booking: rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /bookings/:id/accept — shop confirms the queue (§3.3). Escrowed only.
const acceptBooking = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (!rows.length) return error(res, 'Booking not found', 404);
    const booking = rows[0];
    if (!(await isShopOwner(req.user, booking))) return error(res, 'Forbidden', 403);
    if (booking.status !== 'escrowed') return error(res, 'รับคิวได้เฉพาะออเดอร์ที่ชำระเงินแล้ว', 422);
    if (booking.accepted_at) return error(res, 'รับคิวไปแล้ว', 422);

    const { rows: updated } = await db.query(
      `UPDATE bookings SET accepted_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [booking.id]
    );
    await notify(booking.renter_id, 'accepted', 'ร้านค้ายืนยันรับคิวแล้ว',
      'ร้านกำลังเตรียมจัดส่งชุดของคุณ', booking.id);
    return success(res, { booking: updated[0] });
  } catch (err) {
    next(err);
  }
};

// POST /bookings/:id/reject — shop declines; refund the renter, cancel the order.
const rejectBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const { rows } = await db.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (!rows.length) return error(res, 'Booking not found', 404);
    const booking = rows[0];
    if (!(await isShopOwner(req.user, booking))) return error(res, 'Forbidden', 403);
    if (booking.status !== 'escrowed' || booking.accepted_at) {
      return error(res, 'ปฏิเสธได้เฉพาะออเดอร์ใหม่ที่ยังไม่รับคิว', 422);
    }

    // Shop declined → full refund (renter not at fault).
    await db.query(
      `UPDATE payments SET escrow_status = 'refunded', released_at = NOW()
       WHERE booking_id = $1 AND escrow_status = 'held'`,
      [booking.id]
    );
    await db.query(`UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [booking.id]);
    await notify(booking.renter_id, 'cancelled', 'ร้านค้าปฏิเสธคำสั่งเช่า',
      `${reason || 'ร้านไม่สะดวกรับคิวนี้'} — คืนเงินเต็มจำนวนแล้ว`, booking.id);
    return success(res, { message: 'ปฏิเสธและคืนเงินแล้ว' });
  } catch (err) {
    next(err);
  }
};

// POST /bookings/:id/cancel — cancel; booking fee is non-refundable (§5.2).
const cancelBooking = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (!rows.length) return error(res, 'Booking not found', 404);
    const booking = rows[0];
    if (!(await isBookingOwner(req.user, booking))) return error(res, 'Forbidden', 403);
    if (['shipped', 'returned', 'completed', 'cancelled', 'disputed'].includes(booking.status)) {
      return error(res, 'ยกเลิกไม่ได้ในสถานะนี้', 422);
    }

    // Refund what was paid MINUS the non-refundable booking fee.
    const refundable = Math.max(0, Number(booking.amount_paid) - Number(booking.booking_fee));
    if (Number(booking.amount_paid) > 0) {
      await db.query(
        `UPDATE payments SET escrow_status = 'refunded', released_at = NOW()
         WHERE booking_id = $1 AND escrow_status = 'held'`,
        [booking.id]
      );
    }
    await db.query(`UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [booking.id]);

    const ownerId = await shopOwnerId(booking.shop_id);
    await notify(ownerId, 'cancelled', 'ออเดอร์ถูกยกเลิก', `การเช่าถูกยกเลิก`, booking.id);
    await notify(booking.renter_id, 'cancelled', 'ยกเลิกการจองแล้ว',
      `คืนเงิน ฿${refundable.toFixed(2)} (หักค่าจองคิว ฿${Number(booking.booking_fee).toFixed(2)} ไม่คืน)`, booking.id);

    return success(res, { message: 'ยกเลิกแล้ว', refunded: refundable, booking_fee_kept: Number(booking.booking_fee) });
  } catch (err) {
    next(err);
  }
};

// PATCH /bookings/:id/reschedule — one free date change (§5.2).
const rescheduleBooking = async (req, res, next) => {
  try {
    const { rental_start, rental_end } = req.body;
    const { rows } = await db.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    if (!rows.length) return error(res, 'Booking not found', 404);
    const booking = rows[0];
    if (booking.renter_id !== req.user.id) return error(res, 'Forbidden', 403);
    if (booking.reschedule_used) return error(res, 'เลื่อนคิวฟรีได้เพียง 1 ครั้ง (ใช้สิทธิ์ไปแล้ว)', 422);
    if (['shipped', 'returned', 'completed', 'cancelled', 'disputed'].includes(booking.status)) {
      return error(res, 'เลื่อนคิวไม่ได้ในสถานะนี้', 422);
    }

    // New dates must be free.
    const { rows: conflicts } = await db.query(
      `SELECT id FROM bookings
       WHERE item_id = $1 AND id <> $2 AND status NOT IN ('cancelled','completed')
         AND rental_start < $4 AND rental_end > $3`,
      [booking.item_id, booking.id, rental_start, rental_end]
    );
    if (conflicts.length) return error(res, 'ช่วงวันที่เลือกไม่ว่าง', 409);

    const { rows: updated } = await db.query(
      `UPDATE bookings SET rental_start = $1, rental_end = $2, reschedule_used = TRUE, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [rental_start, rental_end, booking.id]
    );
    return success(res, { booking: updated[0] });
  } catch (err) {
    next(err);
  }
};

// ── Private helpers ───────────────────────────────────────────────────────────
const isShopOwner = async (user, booking) => {
  if (user.role === 'admin') return true;
  const { rows } = await db.query('SELECT id FROM shops WHERE owner_id = $1 AND id = $2', [user.id, booking.shop_id]);
  return rows.length > 0;
};

const isBookingOwner = async (user, booking) => {
  if (user.role === 'admin') return true;
  // A dual-mode user (shop owner who also rents) may be either party.
  if (booking.renter_id === user.id) return true;
  const { rows } = await db.query('SELECT id FROM shops WHERE owner_id = $1 AND id = $2', [user.id, booking.shop_id]);
  return rows.length > 0;
};

module.exports = { createBooking, listBookings, getBooking, updateStatus, getByToken, cancelBooking, rescheduleBooking, acceptBooking, rejectBooking };
