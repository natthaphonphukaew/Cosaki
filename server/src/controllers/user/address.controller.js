const db = require('../../config/db');
const { success, error } = require('../../utils/response');

const FIELDS = ['recipient_name', 'phone', 'province', 'district', 'subdistrict',
  'postal_code', 'detail_line', 'label', 'latitude', 'longitude'];

// GET /users/me/addresses — default first, then newest.
const listAddresses = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM user_addresses WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );
    return success(res, { addresses: rows });
  } catch (err) {
    next(err);
  }
};

// POST /users/me/addresses — create; first address (or is_default) becomes default.
const createAddress = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { rows: [countRow] } = await client.query(
      'SELECT COUNT(*)::int AS n FROM user_addresses WHERE user_id = $1', [req.user.id]
    );
    const makeDefault = countRow.n === 0 || req.body.is_default === true;
    if (makeDefault) {
      await client.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1', [req.user.id]);
    }
    const v = FIELDS.map((f) => req.body[f] ?? null);
    const { rows } = await client.query(
      `INSERT INTO user_addresses
         (user_id, recipient_name, phone, province, district, subdistrict, postal_code, detail_line, label, latitude, longitude, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.user.id, ...v, makeDefault]
    );
    await client.query('COMMIT');
    return success(res, { address: rows[0] }, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// PATCH /users/me/addresses/:id — owner-scoped update (COALESCE per field).
const updateAddress = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { rows: existing } = await client.query(
      'SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!existing.length) { await client.query('ROLLBACK'); return error(res, 'Address not found', 404); }

    if (req.body.is_default === true) {
      await client.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1', [req.user.id]);
    }
    const v = FIELDS.map((f) => req.body[f] ?? null);
    const { rows } = await client.query(
      `UPDATE user_addresses SET
         recipient_name = COALESCE($3, recipient_name),
         phone          = COALESCE($4, phone),
         province       = COALESCE($5, province),
         district       = COALESCE($6, district),
         subdistrict    = COALESCE($7, subdistrict),
         postal_code    = COALESCE($8, postal_code),
         detail_line    = COALESCE($9, detail_line),
         label          = COALESCE($10, label),
         latitude       = COALESCE($11, latitude),
         longitude      = COALESCE($12, longitude),
         is_default     = CASE WHEN $13 THEN TRUE ELSE is_default END,
         updated_at     = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id, ...v, req.body.is_default === true]
    );
    await client.query('COMMIT');
    return success(res, { address: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// DELETE /users/me/addresses/:id — owner-scoped; promote a new default if needed.
const deleteAddress = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING is_default',
      [req.params.id, req.user.id]
    );
    if (!rows.length) { await client.query('ROLLBACK'); return error(res, 'Address not found', 404); }
    if (rows[0].is_default) {
      // Promote the most recent remaining address to default.
      await client.query(
        `UPDATE user_addresses SET is_default = TRUE
         WHERE id = (SELECT id FROM user_addresses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1)`,
        [req.user.id]
      );
    }
    await client.query('COMMIT');
    return success(res, { message: 'ลบที่อยู่แล้ว' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// POST /users/me/addresses/:id/default — make this the default.
const setDefault = async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!rows.length) { await client.query('ROLLBACK'); return error(res, 'Address not found', 404); }
    await client.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1', [req.user.id]);
    await client.query('UPDATE user_addresses SET is_default = TRUE, updated_at = NOW() WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    return success(res, { message: 'ตั้งเป็นค่าเริ่มต้นแล้ว' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { listAddresses, createAddress, updateAddress, deleteAddress, setDefault };
