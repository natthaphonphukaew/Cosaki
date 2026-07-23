const db = require('../../config/db');
const { success, error } = require('../../utils/response');

const getAddresses = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );
    return success(res, { addresses: rows });
  } catch (err) { next(err); }
};

const addAddress = async (req, res, next) => {
  try {
    const { address, address_line1, province, district, sub_district, zip_code, is_default } = req.body;
    
    // Check if this is the first address
    const { rows: existing } = await db.query('SELECT id FROM user_addresses WHERE user_id = $1 LIMIT 1', [req.user.id]);
    const shouldBeDefault = existing.length === 0 || is_default;

    if (shouldBeDefault) {
      await db.query('UPDATE user_addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    }

    const { rows } = await db.query(
      `INSERT INTO user_addresses (user_id, address, address_line1, province, district, sub_district, zip_code, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, address, address_line1, province, district, sub_district, zip_code, shouldBeDefault]
    );

    return success(res, { address: rows[0] }, 201);
  } catch (err) { next(err); }
};

const updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { address, address_line1, province, district, sub_district, zip_code, is_default } = req.body;

    // Verify ownership
    const { rows: existing } = await db.query('SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (!existing.length) return error(res, 'Address not found', 404);

    if (is_default) {
      await db.query('UPDATE user_addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    }

    const { rows } = await db.query(
      `UPDATE user_addresses SET 
        address = COALESCE($1, address),
        address_line1 = COALESCE($2, address_line1),
        province = COALESCE($3, province),
        district = COALESCE($4, district),
        sub_district = COALESCE($5, sub_district),
        zip_code = COALESCE($6, zip_code),
        is_default = COALESCE($7, is_default)
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [address ?? null, address_line1 ?? null, province ?? null, district ?? null, sub_district ?? null, zip_code ?? null, is_default ?? null, id, req.user.id]
    );

    return success(res, { address: rows[0] });
  } catch (err) { next(err); }
};

const deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows: deleted } = await db.query('DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING is_default', [id, req.user.id]);
    
    if (!deleted.length) return error(res, 'Address not found', 404);

    // If we deleted the default, set the newest one as default
    if (deleted[0].is_default) {
      const { rows: latest } = await db.query('SELECT id FROM user_addresses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
      if (latest.length) {
        await db.query('UPDATE user_addresses SET is_default = true WHERE id = $1', [latest[0].id]);
      }
    }

    return success(res, { message: 'Address deleted' });
  } catch (err) { next(err); }
};

const setDefaultAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const { rows: existing } = await db.query('SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (!existing.length) return error(res, 'Address not found', 404);

    await db.query('UPDATE user_addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    await db.query('UPDATE user_addresses SET is_default = true WHERE id = $1', [id]);

    return success(res, { message: 'Default address updated' });
  } catch (err) { next(err); }
};

module.exports = { getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress };
