const db = require('../../config/db');

// Insert a notification. Never throws — a failed notification must not break the
// booking/payment flow that triggered it.
const notify = async (userId, type, title, body = null, bookingId = null) => {
  if (!userId) return;
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, booking_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, body, bookingId]
    );
  } catch (err) {
    console.error('notify failed:', err.message);
  }
};

// Resolve the owner (user id) of a shop.
const shopOwnerId = async (shopId) => {
  try {
    const { rows } = await db.query('SELECT owner_id FROM shops WHERE id = $1', [shopId]);
    return rows[0]?.owner_id || null;
  } catch {
    return null;
  }
};

// Notify every admin (Phase-0 back office is a person). Never throws.
const notifyAdmins = async (type, title, body = null, bookingId = null) => {
  try {
    const { rows } = await db.query(`SELECT id FROM users WHERE role = 'admin'`);
    await Promise.all(rows.map((r) => notify(r.id, type, title, body, bookingId)));
  } catch (err) {
    console.error('notifyAdmins failed:', err.message);
  }
};

module.exports = { notify, shopOwnerId, notifyAdmins };
