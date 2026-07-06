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

    const {
      name, description, character, fandom, sizes, test_rate, private_rate, shipping_fee, min_age, image_urls,
      bust, waist, hip, height_recommended, ship_lead_days, return_days, allow_event, express_delivery, return_couriers,
    } = req.body;
    // daily_rate mirrors test_rate for backward-compat with legacy reads.
    const testRate = test_rate;
    const privateRate = private_rate ?? test_rate;
    const { rows } = await db.query(
      `INSERT INTO items (shop_id, name, description, character, fandom, sizes,
                          daily_rate, test_rate, private_rate, shipping_fee, min_age, deposit_amount, image_urls,
                          bust, waist, hip, height_recommended, ship_lead_days, return_days,
                          allow_event, express_delivery, return_couriers)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,$12,
               $13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *`,
      [shopId, name, description || null, character || null, fandom || null, sizes || [],
       testRate, testRate, privateRate, shipping_fee || 0, min_age || 0, image_urls || [],
       bust ?? null, waist ?? null, hip ?? null, height_recommended || null,
       ship_lead_days ?? 2, return_days ?? 2, !!allow_event, !!express_delivery, return_couriers || []]
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
      `SELECT i.*, s.shop_name, s.rating AS shop_rating, s.review_count AS shop_review_count,
              (SELECT COUNT(*) FROM bookings b WHERE b.item_id = i.id AND b.status = 'completed')::int AS rented_count
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

    const {
      name, description, character, fandom, sizes, test_rate, private_rate, shipping_fee, min_age, is_available, image_urls,
      bust, waist, hip, height_recommended, ship_lead_days, return_days, allow_event, express_delivery, return_couriers,
    } = req.body;
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
         min_age        = COALESCE($9, min_age),
         is_available   = COALESCE($10, is_available),
         image_urls     = COALESCE($11, image_urls),
         bust               = COALESCE($14, bust),
         waist              = COALESCE($15, waist),
         hip                = COALESCE($16, hip),
         height_recommended = COALESCE($17, height_recommended),
         ship_lead_days     = COALESCE($18, ship_lead_days),
         return_days        = COALESCE($19, return_days),
         allow_event        = COALESCE($20, allow_event),
         express_delivery   = COALESCE($21, express_delivery),
         return_couriers    = COALESCE($22, return_couriers),
         updated_at     = NOW()
       WHERE id = $12 AND shop_id = $13
       RETURNING *`,
      [name, description, character, fandom, sizes, test_rate, private_rate, shipping_fee, min_age, is_available, image_urls || null, req.params.id, shopId,
       bust ?? null, waist ?? null, hip ?? null, height_recommended ?? null,
       ship_lead_days ?? null, return_days ?? null,
       allow_event ?? null, express_delivery ?? null, return_couriers ?? null]
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

// GET /items/:id/availability — booked date ranges (for the live calendar)
const getAvailability = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT rental_start, rental_end FROM bookings
       WHERE item_id = $1
         AND status NOT IN ('cancelled', 'completed', 'draft')
         AND rental_end >= CURRENT_DATE
       ORDER BY rental_start`,
      [req.params.id]
    );
    return success(res, { booked: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { createItem, listMyItems, getItem, updateItem, deleteItem, searchItems, getAvailability };
