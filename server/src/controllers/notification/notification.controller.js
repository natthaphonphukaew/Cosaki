const db = require('../../config/db');
const { success, error } = require('../../utils/response');

// GET /notifications
const listNotifications = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    return success(res, { notifications: rows });
  } catch (err) {
    next(err);
  }
};

// GET /notifications/unread-count
const unreadCount = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    return success(res, { count: rows[0].count });
  } catch (err) {
    next(err);
  }
};

// PATCH /notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rowCount) return error(res, 'Notification not found', 404);
    return success(res, { message: 'Marked read' });
  } catch (err) {
    next(err);
  }
};

// POST /notifications/read-all
const markAllRead = async (req, res, next) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    return success(res, { message: 'All marked read' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listNotifications, unreadCount, markRead, markAllRead };
