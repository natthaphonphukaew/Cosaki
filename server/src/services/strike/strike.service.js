const db = require('../../config/db');
const { notify } = require('../notification/notification.service');

// Issue a strike and enforce the tier penalties (PRD §4.2.3):
//   3 strikes / 30 days  → removed from "recommended"
//   5 strikes / 30 days  → freeze shop 2 weeks (+1 freeze count)
//   3 freezes (lifetime) → permanent ban of the owner's account
const addStrike = async (shopId, reason, bookingId = null) => {
  await db.query(
    `INSERT INTO shop_strikes (shop_id, booking_id, reason) VALUES ($1, $2, $3)`,
    [shopId, bookingId, reason]
  );

  const { rows: [m] } = await db.query(
    `SELECT COUNT(*)::int AS n FROM shop_strikes
     WHERE shop_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
    [shopId]
  );
  const monthly = m.n;
  const { rows: [shop] } = await db.query('SELECT owner_id FROM shops WHERE id = $1', [shopId]);
  const ownerId = shop?.owner_id;

  if (monthly >= 5) {
    const { rows: [updated] } = await db.query(
      `UPDATE shops SET is_frozen = TRUE, frozen_until = NOW() + INTERVAL '14 days',
                        is_recommended = FALSE, freeze_count = freeze_count + 1, updated_at = NOW()
       WHERE id = $1 RETURNING freeze_count`,
      [shopId]
    );
    await notify(ownerId, 'strike', 'ร้านถูกระงับชั่วคราว',
      'สะสมใบเตือนครบ 5 ครั้งในเดือนนี้ — ระงับร้าน 2 สัปดาห์', bookingId);
    if (updated.freeze_count >= 3) {
      await db.query(`UPDATE users SET account_status = 'banned', updated_at = NOW() WHERE id = $1`, [ownerId]);
      await notify(ownerId, 'strike', 'บัญชีถูกแบนถาวร',
        'ถูกระงับร้านครบ 3 ครั้ง — แบนถาวรตามนโยบาย', bookingId);
    }
  } else if (monthly >= 3) {
    await db.query(`UPDATE shops SET is_recommended = FALSE, updated_at = NOW() WHERE id = $1`, [shopId]);
    await notify(ownerId, 'strike', 'ถูกปลดจากร้านแนะนำ',
      'สะสมใบเตือนครบ 3 ครั้งในเดือนนี้', bookingId);
  } else {
    await notify(ownerId, 'strike', 'ได้รับใบเตือน (Strike)', reason, bookingId);
  }
  return { monthly };
};

// Lazily lift an expired freeze; returns the shop row. Blocks callers if still frozen.
const ensureShopActive = async (shopId) => {
  const { rows: [shop] } = await db.query('SELECT * FROM shops WHERE id = $1', [shopId]);
  if (!shop) return null;
  if (shop.is_frozen && shop.frozen_until && new Date(shop.frozen_until) < new Date()) {
    await db.query('UPDATE shops SET is_frozen = FALSE, updated_at = NOW() WHERE id = $1', [shopId]);
    shop.is_frozen = false;
  }
  return shop;
};

module.exports = { addStrike, ensureShopActive };
