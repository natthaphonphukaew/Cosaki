const db = require('../../config/db');
const { success, error } = require('../../utils/response');

// Recompute a shop's cached rating + review_count from its reviews.
const refreshShopRating = async (shopId) => {
  await db.query(
    `UPDATE shops SET
       rating       = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE shop_id = $1), 5.00),
       review_count = (SELECT COUNT(*) FROM reviews WHERE shop_id = $1),
       updated_at   = NOW()
     WHERE id = $1`,
    [shopId]
  );
};

// POST /bookings/:id/reviews — renter reviews a completed booking (once).
const createReview = async (req, res, next) => {
  try {
    const { rating, comment, tags } = req.body;
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return error(res, 'rating must be an integer from 1 to 5', 422);
    }

    const { rows: bookings } = await db.query(
      'SELECT * FROM bookings WHERE id = $1',
      [req.params.id]
    );
    if (!bookings.length) return error(res, 'Booking not found', 404);
    const booking = bookings[0];

    if (booking.renter_id !== req.user.id) return error(res, 'Forbidden', 403);
    if (booking.status !== 'completed') {
      return error(res, 'You can only review a completed rental', 422);
    }

    const { rows: existing } = await db.query(
      'SELECT id FROM reviews WHERE booking_id = $1',
      [booking.id]
    );
    if (existing.length) return error(res, 'You already reviewed this rental', 409);

    const { rows } = await db.query(
      `INSERT INTO reviews (booking_id, reviewer_id, shop_id, item_id, rating, comment, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [booking.id, req.user.id, booking.shop_id, booking.item_id, r, comment || null, tags || []]
    );

    await refreshShopRating(booking.shop_id);

    return success(res, { review: rows[0] }, 201);
  } catch (err) {
    next(err);
  }
};

// GET /shops/:id/reviews — public list + aggregate.
const listShopReviews = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT r.id, r.rating, r.comment, r.tags, r.created_at,
              u.display_name AS reviewer_name, u.avatar_url AS reviewer_avatar,
              i.name AS item_name
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       JOIN items i ON i.id = r.item_id
       WHERE r.shop_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [req.params.id]
    );

    const { rows: [agg] } = await db.query(
      `SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 5.00) AS average,
              COUNT(*) AS count
       FROM reviews WHERE shop_id = $1`,
      [req.params.id]
    );

    return success(res, { reviews: rows, average: Number(agg.average), count: Number(agg.count) });
  } catch (err) {
    next(err);
  }
};

module.exports = { createReview, listShopReviews };
