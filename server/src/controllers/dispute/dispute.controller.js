const db = require('../../config/db');
const s3 = require('../../services/storage/s3.service');
const { success, error } = require('../../utils/response');

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

    // Freeze renter's KYC account
    await db.query(
      `UPDATE users SET kyc_status = 'frozen', updated_at = NOW() WHERE id = $1`,
      [booking.renter_id]
    );

    return success(res, { dispute: rows[0] }, 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /disputes/:id/resolve — admin resolves dispute
const resolveDispute = async (req, res, next) => {
  try {
    const { resolution, resolution_note, compensation_amount } = req.body;
    if (!['resolved_shop', 'resolved_renter'].includes(resolution)) {
      return error(res, 'Invalid resolution value', 422);
    }

    const { rows: disputes } = await db.query(
      'SELECT * FROM disputes WHERE id = $1 AND status = $2',
      [req.params.id, 'under_review']
    );
    if (!disputes.length) return error(res, 'Dispute not found or not under review', 404);
    const dispute = disputes[0];

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

    // Unfreeze renter if resolved in their favour
    if (resolution === 'resolved_renter') {
      const { rows: bookings } = await db.query(
        'SELECT renter_id FROM bookings WHERE id = $1',
        [dispute.booking_id]
      );
      if (bookings.length) {
        await db.query(
          `UPDATE users SET kyc_status = 'verified', updated_at = NOW() WHERE id = $1`,
          [bookings[0].renter_id]
        );
      }
    }

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

module.exports = { uploadEvidence, createDispute, resolveDispute, listDisputes };
