const db = require('../../config/db');
const { success, error } = require('../../utils/response');
const { ensureShopActive } = require('../../services/strike/strike.service');
const { RETURN_FREEZE_DAYS } = require('../../utils/bookingRules');

const getShopId = async (userId) => {
  const { rows } = await db.query('SELECT id FROM shops WHERE owner_id = $1', [userId]);
  return rows[0]?.id || null;
};

// POST /shops/me/items
const createItem = async (req, res, next) => {
  try {
    const shopId = await getShopId(req.user.id);
    if (!shopId) return error(res, 'Create a shop first', 404);
    const shop = await ensureShopActive(shopId);
    if (shop?.is_frozen) return error(res, 'ร้านถูกระงับชั่วคราว — ลงสินค้าใหม่ไม่ได้', 403);

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
              s.owner_id AS shop_owner_id,
              s.rules_text AS shop_rules_text, s.rules_image_url AS shop_rules_image,
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
    const {
      fandom, q, size, page = 1, limit = 20,
      price_min, price_max, bust, waist, hip,
      date_from, date_to, allow_event, fandoms,
    } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = ['i.is_available = TRUE', 's.is_frozen = FALSE'];
    const params = [];
    const P = (v) => { params.push(v); return `$${params.length}`; };

    if (fandom) conditions.push(`i.fandom ILIKE ${P(`%${fandom}%`)}`);   // partial match
    if (q) {
      const p = P(`%${q}%`);
      conditions.push(`(i.name ILIKE ${p} OR i.character ILIKE ${p} OR i.fandom ILIKE ${p})`);
    }
    if (size) conditions.push(`${P(size)} = ANY(i.sizes)`);
    if (price_min) conditions.push(`i.test_rate >= ${P(Number(price_min))}`);
    if (price_max) conditions.push(`i.test_rate <= ${P(Number(price_max))}`);
    // Body-measurement matching (§2.1.2): item fits if within ±6cm or unspecified.
    if (bust)  conditions.push(`(i.bust  IS NULL OR ABS(i.bust  - ${P(Number(bust))})  <= 6)`);
    if (waist) conditions.push(`(i.waist IS NULL OR ABS(i.waist - ${P(Number(waist))}) <= 6)`);
    if (hip)   conditions.push(`(i.hip   IS NULL OR ABS(i.hip   - ${P(Number(hip))})   <= 6)`);
    if (allow_event === 'true') conditions.push(`i.allow_event = TRUE`);
    // Availability window (§2.1.4): hide items whose window (incl. the 10-day
    // post-return freeze) overlaps a PAID booking. Two half-open spans overlap
    // iff from < rental_end + 10 AND rental_start < to + 10.
    if (date_from && date_to) {
      const f = P(date_from), t = P(date_to);
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM bookings b WHERE b.item_id = i.id
          AND b.status IN ('escrowed','shipped','returned','completed')
          AND ${f}::date < (b.rental_end + ${RETURN_FREEZE_DAYS})
          AND b.rental_start < (${t}::date + ${RETURN_FREEZE_DAYS}))`);
    }

    // Home-feed boost (§1.3): items in the user's fandoms rank first.
    let orderBy = 'i.created_at DESC';
    if (fandoms) {
      const list = String(fandoms).split(',').map((s) => s.trim()).filter(Boolean);
      // COALESCE: NULL fandom must sort as "no match", not NULLS-FIRST.
      if (list.length) orderBy = `COALESCE(i.fandom = ANY(${P(list)}), FALSE) DESC, i.created_at DESC`;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    params.push(Number(limit), offset);

    const { rows } = await db.query(
      `SELECT i.*, s.shop_name, s.rating AS shop_rating, s.review_count AS shop_review_count
       FROM items i JOIN shops s ON s.id = i.shop_id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return success(res, { items: rows });
  } catch (err) {
    next(err);
  }
};

// GET /items/:id/availability — occupied date ranges for the live calendar.
// Only PAID (committed) bookings occupy the calendar, and each occupies
// [rental_start, rental_end + 10-day wash/iron freeze). `blocked_until` is the
// first date the item is bookable again (exclusive end of the grey range).
const getAvailability = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT rental_start, (rental_end + ${RETURN_FREEZE_DAYS}) AS blocked_until
       FROM bookings
       WHERE item_id = $1
         AND status IN ('escrowed', 'shipped', 'returned', 'completed')
         AND (rental_end + ${RETURN_FREEZE_DAYS}) >= CURRENT_DATE
       ORDER BY rental_start`,
      [req.params.id]
    );
    return success(res, { booked: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { createItem, listMyItems, getItem, updateItem, deleteItem, searchItems, getAvailability };
