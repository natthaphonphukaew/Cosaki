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

// PATCH /users/me — profile incl. default address + body measurements (§2.6)
const updateMe = async (req, res, next) => {
  try {
    const { display_name, avatar_url, address, address_line1, province, district, sub_district, zip_code, bust, waist, hip, height, fandoms } = req.body;
    const { rows } = await db.query(
      `UPDATE users SET
         display_name  = COALESCE($1, display_name),
         avatar_url    = COALESCE($2, avatar_url),
         address       = COALESCE($3, address),
         address_line1 = COALESCE($4, address_line1),
         province      = COALESCE($5, province),
         district      = COALESCE($6, district),
         sub_district  = COALESCE($7, sub_district),
         zip_code      = COALESCE($8, zip_code),
         bust          = COALESCE($9, bust),
         waist         = COALESCE($10, waist),
         hip           = COALESCE($11, hip),
         height        = COALESCE($12, height),
         fandoms       = COALESCE($13, fandoms),
         updated_at    = NOW()
       WHERE id = $14 RETURNING *`,
      [display_name || null, avatar_url || null, address ?? null,
       address_line1 ?? null, province ?? null, district ?? null, sub_district ?? null, zip_code ?? null,
       bust ?? null, waist ?? null, hip ?? null, height ?? null,
       Array.isArray(fandoms) ? fandoms : null, req.user.id]
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
