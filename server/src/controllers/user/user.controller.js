const db = require('../../config/db');
const { success, error } = require('../../utils/response');

// GET /users/me
const getMe = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return error(res, 'User not found', 404);
    const { google_id, facebook_id, ...safe } = rows[0];
    return success(res, { user: safe });
  } catch (err) { next(err); }
};

// PATCH /users/me
const updateMe = async (req, res, next) => {
  try {
    const { display_name, avatar_url, is_minor } = req.body;
    const { rows } = await db.query(
      `UPDATE users SET
         display_name = COALESCE($1, display_name),
         avatar_url   = COALESCE($2, avatar_url),
         is_minor     = COALESCE($3, is_minor),
         updated_at   = NOW()
       WHERE id = $4 RETURNING *`,
      [display_name || null, avatar_url || null, is_minor ?? null, req.user.id]
    );
    const { google_id, facebook_id, ...safe } = rows[0];
    return success(res, { user: safe });
  } catch (err) { next(err); }
};

// GET /users/:id/trust  — public trust score
const getTrustScore = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, display_name, avatar_url, trust_score, kyc_status,
              (SELECT COUNT(*) FROM bookings WHERE renter_id = u.id AND status = 'completed') AS rentals_completed
       FROM users u WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'User not found', 404);
    return success(res, { profile: rows[0] });
  } catch (err) { next(err); }
};

module.exports = { getMe, updateMe, getTrustScore };
