const db = require('../../config/db');
const { success, error } = require('../../utils/response');
const { signAccessToken } = require('../../utils/jwt');
const { ensureShopActive } = require('../../services/strike/strike.service');

// POST /shops — any authenticated user can open a shop (renter becomes seller).
const createShop = async (req, res, next) => {
  try {
    const { shop_name, description, logo_url, cover_url, location, categories, rules_text, rules_image_url } = req.body;
    const existing = await db.query('SELECT id FROM shops WHERE owner_id = $1', [req.user.id]);
    if (existing.rows.length) return error(res, 'You already have a shop', 409);

    const { rows } = await db.query(
      `INSERT INTO shops (owner_id, shop_name, description, logo_url, cover_url, location, categories, rules_text, rules_image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        req.user.id, shop_name, description || null,
        logo_url || null, cover_url || null, location || null, categories || [],
        rules_text || null, rules_image_url || null,
      ]
    );

    // Promote the owner to shop_admin so they can manage items/orders.
    // The JWT carries the role, so mint a fresh access token reflecting it.
    const { rows: [updated] } = await db.query(
      `UPDATE users SET role = 'shop_admin', updated_at = NOW()
       WHERE id = $1 AND role = 'renter'
       RETURNING role`,
      [req.user.id]
    );
    const newRole = updated?.role || req.user.role;
    const accessToken = signAccessToken(req.user.id, newRole);

    return success(res, { shop: rows[0], accessToken, role: newRole }, 201);
  } catch (err) {
    next(err);
  }
};

// GET /shops/me — get own shop
const getMyShop = async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT id FROM shops WHERE owner_id = $1', [req.user.id]);
    if (!rows.length) return error(res, 'Shop not found', 404);
    const shop = await ensureShopActive(rows[0].id);   // lazily lift expired freeze
    const { rows: [s] } = await db.query(
      `SELECT COUNT(*)::int AS n FROM shop_strikes
       WHERE shop_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
      [shop.id]
    );
    return success(res, { shop: { ...shop, strikes_30d: s.n } });
  } catch (err) {
    next(err);
  }
};

// PATCH /shops/me — update shop profile
const updateShop = async (req, res, next) => {
  try {
    const { shop_name, description, bank_account, logo_url, cover_url, location, categories, rules_text, rules_image_url } = req.body;
    const { rows } = await db.query(
      `UPDATE shops SET
         shop_name       = COALESCE($1, shop_name),
         description      = COALESCE($2, description),
         bank_account    = COALESCE($3, bank_account),
         logo_url        = COALESCE($4, logo_url),
         cover_url       = COALESCE($5, cover_url),
         location        = COALESCE($6, location),
         categories      = COALESCE($7, categories),
         rules_text      = COALESCE($9, rules_text),
         rules_image_url = COALESCE($10, rules_image_url),
         updated_at      = NOW()
       WHERE owner_id = $8
       RETURNING *`,
      [
        shop_name || null, description || null,
        bank_account ? JSON.stringify(bank_account) : null,
        logo_url || null, cover_url || null, location || null,
        categories || null, req.user.id,
        rules_text ?? null, rules_image_url ?? null,
      ]
    );
    if (!rows.length) return error(res, 'Shop not found', 404);
    return success(res, { shop: rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /shops/:id — public shop profile (+follower count)
const getShop = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, u.display_name AS owner_name,
              (SELECT COUNT(*)::int FROM shop_follows f WHERE f.shop_id = s.id) AS follower_count,
              (SELECT COUNT(*)::int FROM items i WHERE i.shop_id = s.id AND i.is_available) AS item_count
       FROM shops s JOIN users u ON u.id = s.owner_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Shop not found', 404);
    return success(res, { shop: rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /shops/:id/items?q= — public listing of a shop's items (search-in-shop §2.3)
const getShopItems = async (req, res, next) => {
  try {
    const { q } = req.query;
    const params = [req.params.id];
    let where = 'i.shop_id = $1 AND i.is_available = TRUE';
    if (q) {
      params.push(`%${q}%`);
      where += ` AND (i.name ILIKE $2 OR i.character ILIKE $2 OR i.fandom ILIKE $2)`;
    }
    const { rows } = await db.query(
      `SELECT i.*, s.shop_name, s.rating AS shop_rating
       FROM items i JOIN shops s ON s.id = i.shop_id
       WHERE ${where} ORDER BY i.created_at DESC LIMIT 60`,
      params
    );
    return success(res, { items: rows });
  } catch (err) {
    next(err);
  }
};

// POST /shops/:id/follow — toggle follow; returns following + follower_count.
const toggleFollow = async (req, res, next) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM shop_follows WHERE user_id = $1 AND shop_id = $2',
      [req.user.id, req.params.id]
    );
    let following = false;
    if (!rowCount) {
      await db.query(
        'INSERT INTO shop_follows (user_id, shop_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.user.id, req.params.id]
      );
      following = true;
    }
    const { rows: [c] } = await db.query(
      'SELECT COUNT(*)::int AS n FROM shop_follows WHERE shop_id = $1', [req.params.id]
    );
    return success(res, { following, follower_count: c.n });
  } catch (err) {
    next(err);
  }
};

// GET /shops/:id/follow — am I following this shop?
const getFollowState = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT 1 FROM shop_follows WHERE user_id = $1 AND shop_id = $2',
      [req.user.id, req.params.id]
    );
    return success(res, { following: rows.length > 0 });
  } catch (err) {
    next(err);
  }
};

module.exports = { createShop, getMyShop, updateShop, getShop, getShopItems, toggleFollow, getFollowState };
