const db = require('../../config/db');
const { success, error } = require('../../utils/response');

const getShopId = async (userId) => {
  const { rows } = await db.query('SELECT id FROM shops WHERE owner_id = $1', [userId]);
  return rows[0]?.id || null;
};

// POST /shops/me/items
const createItem = async (req, res, next) => {
  try {
    const shopId = await getShopId(req.user.id);
    if (!shopId) return error(res, 'Create a shop first', 404);

    const { name, description, character, fandom, sizes, test_rate, private_rate, shipping_fee, image_urls } = req.body;
    // daily_rate mirrors test_rate for backward-compat with legacy reads.
    const testRate = test_rate;
    const privateRate = private_rate ?? test_rate;
    const { rows } = await db.query(
      `INSERT INTO items (shop_id, name, description, character, fandom, sizes,
                          daily_rate, test_rate, private_rate, shipping_fee, deposit_amount, image_urls)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11) RETURNING *`,
      [shopId, name, description || null, character || null, fandom || null, sizes || [],
       testRate, testRate, privateRate, shipping_fee || 0, image_urls || []]
    );
    return success(res, { item: rows[0] }, 201);
  } catch (err) {
    next(err);
  }
};

// GET /shops/me/items
const listMyItems = async (req, res, next) => {
  try {
    const shopId = await getShopId(req.user.id);
    if (!shopId) return error(res, 'Shop not found', 404);

    const { rows } = await db.query(
      'SELECT * FROM items WHERE shop_id = $1 ORDER BY created_at DESC',
      [shopId]
    );
    return success(res, { items: rows });
  } catch (err) {
    next(err);
  }
};

// GET /items/:id — public
const getItem = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT i.*, s.shop_name, s.rating AS shop_rating, s.review_count AS shop_review_count
       FROM items i JOIN shops s ON s.id = i.shop_id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Item not found', 404);
    return success(res, { item: rows[0] });
  } catch (err) {
    next(err);
  }
};

// PATCH /shops/me/items/:id
const updateItem = async (req, res, next) => {
  try {
    const shopId = await getShopId(req.user.id);
    if (!shopId) return error(res, 'Shop not found', 404);

    const { name, description, character, fandom, sizes, test_rate, private_rate, shipping_fee, is_available, image_urls } = req.body;
    const { rows } = await db.query(
      `UPDATE items SET
         name           = COALESCE($1, name),
         description    = COALESCE($2, description),
         character      = COALESCE($3, character),
         fandom         = COALESCE($4, fandom),
         sizes          = COALESCE($5, sizes),
         test_rate      = COALESCE($6, test_rate),
         daily_rate     = COALESCE($6, daily_rate),
         private_rate   = COALESCE($7, private_rate),
         shipping_fee   = COALESCE($8, shipping_fee),
         is_available   = COALESCE($9, is_available),
         image_urls     = COALESCE($10, image_urls),
         updated_at     = NOW()
       WHERE id = $11 AND shop_id = $12
       RETURNING *`,
      [name, description, character, fandom, sizes, test_rate, private_rate, shipping_fee, is_available, image_urls || null, req.params.id, shopId]
    );
    if (!rows.length) return error(res, 'Item not found', 404);
    return success(res, { item: rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /shops/me/items/:id
const deleteItem = async (req, res, next) => {
  try {
    const shopId = await getShopId(req.user.id);
    if (!shopId) return error(res, 'Shop not found', 404);

    const { rowCount } = await db.query(
      'DELETE FROM items WHERE id = $1 AND shop_id = $2',
      [req.params.id, shopId]
    );
    if (!rowCount) return error(res, 'Item not found', 404);
    return success(res, { message: 'Item deleted' });
  } catch (err) {
    next(err);
  }
};

// GET /items?fandom=&q=&page=&limit=  — public search
const searchItems = async (req, res, next) => {
  try {
    const { fandom, q, size, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = ['i.is_available = TRUE'];
    const params = [];

    if (fandom) {
      params.push(`%${fandom}%`);   // partial match: "Genshin" finds "Genshin Impact"
      conditions.push(`i.fandom ILIKE $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(i.name ILIKE $${params.length} OR i.character ILIKE $${params.length})`);
    }
    if (size) {
      params.push(size);
      conditions.push(`$${params.length} = ANY(i.sizes)`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(Number(limit), offset);

    const { rows } = await db.query(
      `SELECT i.*, s.shop_name, s.rating AS shop_rating, s.review_count AS shop_review_count
       FROM items i JOIN shops s ON s.id = i.shop_id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return success(res, { items: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { createItem, listMyItems, getItem, updateItem, deleteItem, searchItems };
