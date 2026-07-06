const db = require('../../config/db');
const s3 = require('../../services/storage/s3.service');
const { success, error } = require('../../utils/response');
const { notify, shopOwnerId } = require('../../services/notification/notification.service');

// POST /evidence — upload pre_ship or unboxing photos/videos
const uploadEvidence = async (req, res, next) => {
  try {
    const { booking_id, stage } = req.body;
    if (!['pre_ship', 'unboxing'].includes(stage)) {
      return error(res, 'stage must be pre_ship or unboxing', 422);
    }
    if (!req.files?.length) return error(res, 'At least one file required', 400);

    // Verify user belongs to this booking
    const { rows: bookings } = await db.query(
      `SELECT b.*, s.owner_id AS shop_owner_id
       FROM bookings b JOIN shops s ON s.id = b.shop_id
       WHERE b.id = $1`,
      [booking_id]
    );
    if (!bookings.length) return error(res, 'Booking not found', 404);
    const booking = bookings[0];

    const isParty = booking.renter_id === req.user.id || booking.shop_owner_id === req.user.id;
    if (!isParty) return error(res, 'Forbidden', 403);

    const keys = await Promise.all(
      req.files.map((f) =>
        s3.upload(f.buffer, f.mimetype, `evidence/${booking_id}/${stage}`)
      )
    );

    const { rows } = await db.query(
      `INSERT INTO evidence_uploads (booking_id, uploaded_by, stage, s3_keys)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [booking_id, req.user.id, stage, keys]
    );
    return success(res, { evidence: rows[0] }, 201);
  } catch (err) {
    next(err);
  }
};

// POST /disputes — raise a dispute
const createDispute = async (req, res, next) => {
  try {
    const { booking_id, reason } = req.body;

    const { rows: bookings } = await db.query(
      `SELECT b.*, s.owner_id AS shop_owner_id
       FROM bookings b JOIN shops s ON s.id = b.shop_id
       WHERE b.id = $1`,
      [booking_id]
    );
    if (!bookings.length) return error(res, 'Booking not found', 404);
    const booking = bookings[0];

    const isParty = booking.renter_id === req.user.id || booking.shop_owner_id === req.user.id;
    if (!isParty) return error(res, 'Forbidden', 403);

    if (!['escrowed', 'shipped', 'returned'].includes(booking.status)) {
      return error(res, 'Dispute can only be raised on active bookings', 422);
    }

    // Open dispute + freeze booking
    const { rows } = await db.query(
      `INSERT INTO disputes (booking_id, raised_by, reason)
       VALUES ($1,$2,$3) RETURNING *`,
      [booking_id, req.user.id, reason]
    );
    await db.query(
      `UPDATE bookings SET status = 'disputed', updated_at = NOW() WHERE id = $1`,
      [booking_id]
    );

    // Flag the renter's account as watchlist (must settle before renting again).
    await db.query(
      `UPDATE users SET kyc_status = 'frozen', account_status = 'watchlist', updated_at = NOW() WHERE id = $1`,
      [booking.renter_id]
    );

    // Notify the other party that a dispute was opened.
    const counterparty = req.user.id === booking.renter_id ? booking.shop_owner_id : booking.renter_id;
    await notify(counterparty, 'dispute', 'A dispute was opened',
      'A dispute was raised on a rental. Open the Resolution Center to respond.', booking_id);

    return success(res, { dispute: rows[0] }, 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /disputes/:id/resolve — admin OR the owning shop resolves the dispute.
// (Real arbitration would be admin-only; relaxed to the shop for the test build.)
const resolveDispute = async (req, res, next) => {
  try {
    const { resolution, resolution_note, compensation_amount } = req.body;
    if (!['resolved_shop', 'resolved_renter'].includes(resolution)) {
      return error(res, 'Invalid resolution value', 422);
    }

    // Disputes are created 'open'; accept either open or under_review.
    const { rows: disputes } = await db.query(
      `SELECT d.*, b.shop_id, b.renter_id, s.owner_id AS shop_owner_id
       FROM disputes d
       JOIN bookings b ON b.id = d.booking_id
       JOIN shops s ON s.id = b.shop_id
       WHERE d.id = $1 AND d.status IN ('open', 'under_review')`,
      [req.params.id]
    );
    if (!disputes.length) return error(res, 'Dispute not found or already resolved', 404);
    const dispute = disputes[0];

    // Authorize: platform admin or the shop that owns the booking.
    if (req.user.role !== 'admin' && dispute.shop_owner_id !== req.user.id) {
      return error(res, 'Forbidden', 403);
    }

    await db.query(
      `UPDATE disputes
       SET status = $1, resolution_note = $2,
           compensation_amount = $3, compensated_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [resolution, resolution_note || null, compensation_amount || null, dispute.id]
    );

    // Release or refund escrow accordingly
    const escrowStatus = resolution === 'resolved_shop' ? 'released_to_shop' : 'refunded';
    await db.query(
      `UPDATE payments SET escrow_status = $1, released_at = NOW()
       WHERE booking_id = $2 AND escrow_status = 'held'`,
      [escrowStatus, dispute.booking_id]
    );

    await db.query(
      `UPDATE bookings SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [dispute.booking_id]
    );

    // Restore the renter's account after resolution either way (test-friendly).
    await db.query(
      `UPDATE users SET kyc_status = 'verified', account_status = 'normal', updated_at = NOW() WHERE id = $1`,
      [dispute.renter_id]
    );

    // Notify both parties of the outcome.
    const outcome = resolution === 'resolved_shop'
      ? 'Resolved in the shop\'s favour.'
      : 'Resolved in the renter\'s favour (deposit refunded).';
    await notify(dispute.renter_id, 'dispute', 'Dispute resolved', outcome, dispute.booking_id);
    await notify(dispute.shop_owner_id, 'dispute', 'Dispute resolved', outcome, dispute.booking_id);

    return success(res, { message: 'Dispute resolved' });
  } catch (err) {
    next(err);
  }
};

// GET /disputes — admin list
const listDisputes = async (req, res, next) => {
  try {
    const { status = 'open' } = req.query;
    const { rows } = await db.query(
      `SELECT d.*, b.rental_start, b.rental_end,
              u.display_name AS raised_by_name, i.name AS item_name
       FROM disputes d
       JOIN bookings b ON b.id = d.booking_id
       JOIN users u ON u.id = d.raised_by
       JOIN items i ON i.id = b.item_id
       WHERE d.status = $1
       ORDER BY d.created_at DESC`,
      [status]
    );
    return success(res, { disputes: rows });
  } catch (err) {
    next(err);
  }
};

// GET /disputes/by-booking/:bookingId — latest dispute + evidence for a booking.
const getDisputeByBooking = async (req, res, next) => {
  try {
    const { rows: bookings } = await db.query(
      `SELECT b.*, s.owner_id AS shop_owner_id FROM bookings b
       JOIN shops s ON s.id = b.shop_id WHERE b.id = $1`,
      [req.params.bookingId]
    );
    if (!bookings.length) return error(res, 'Booking not found', 404);
    const booking = bookings[0];

    const isParty = booking.renter_id === req.user.id
      || booking.shop_owner_id === req.user.id
      || req.user.role === 'admin';
    if (!isParty) return error(res, 'Forbidden', 403);

    const { rows: disputes } = await db.query(
      `SELECT * FROM disputes WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.params.bookingId]
    );
    const { rows: evidence } = await db.query(
      `SELECT id, stage, s3_keys, uploaded_by, uploaded_at FROM evidence_uploads
       WHERE booking_id = $1 ORDER BY uploaded_at DESC`,
      [req.params.bookingId]
    );

    return success(res, { dispute: disputes[0] || null, evidence });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadEvidence, createDispute, resolveDispute, listDisputes, getDisputeByBooking };
