const crypto = require('crypto');
const db = require('../../config/db');
const { success, error } = require('../../utils/response');

// POST /bookings/:id/parent-consent — triggered when renter is_minor=true
const requestConsent = async (req, res, next) => {
  try {
    const { parent_phone } = req.body;
    const { rows: bookings } = await db.query(
      'SELECT * FROM bookings WHERE id = $1 AND renter_id = $2',
      [req.params.id, req.user.id]
    );
    if (!bookings.length) return error(res, 'Booking not found', 404);

    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

    const { rows } = await db.query(
      `INSERT INTO parent_consents
         (booking_id, minor_user_id, parent_phone, consent_token, expires_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (booking_id) DO UPDATE
         SET parent_phone = $3, consent_token = $4, expires_at = $5, status = 'pending'
       RETURNING *`,
      [req.params.id, req.user.id, parent_phone, token, expiresAt]
    );

    // TODO: send SMS with consent link to parent_phone
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Parent consent link: /consent/${token}`);
    }

    return success(res, { consent: rows[0] }, 201);
  } catch (err) {
    next(err);
  }
};

// GET /consent/:token — parent opens the link (public)
const getConsentPage = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT pc.*, b.rental_start, b.rental_end, i.name AS item_name, u.display_name AS minor_name
       FROM parent_consents pc
       JOIN bookings b ON b.id = pc.booking_id
       JOIN items i ON i.id = b.item_id
       JOIN users u ON u.id = pc.minor_user_id
       WHERE pc.consent_token = $1 AND pc.expires_at > NOW() AND pc.status = 'pending'`,
      [req.params.token]
    );
    if (!rows.length) return error(res, 'Consent link expired or invalid', 404);
    return success(res, { consent: rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /consent/:token/approve — parent approves
const approveConsent = async (req, res, next) => {
  try {
    const { action } = req.body; // 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(action)) return error(res, 'Invalid action', 422);

    const { rows } = await db.query(
      `UPDATE parent_consents SET status = $1
       WHERE consent_token = $2 AND expires_at > NOW() AND status = 'pending'
       RETURNING *`,
      [action, req.params.token]
    );
    if (!rows.length) return error(res, 'Consent link expired or already used', 410);

    // If approved, advance booking to pending_payment
    if (action === 'approved') {
      await db.query(
        `UPDATE bookings SET status = 'pending_payment', updated_at = NOW()
         WHERE id = $1 AND status = 'pending_kyc'`,
        [rows[0].booking_id]
      );
    } else {
      await db.query(
        `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [rows[0].booking_id]
      );
    }
    return success(res, { message: `Consent ${action}` });
  } catch (err) {
    next(err);
  }
};

module.exports = { requestConsent, getConsentPage, approveConsent };
