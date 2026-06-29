const db = require('../../config/db');
const { success, error } = require('../../utils/response');

const getShop = async (userId) => {
  const { rows } = await db.query('SELECT id, bank_account FROM shops WHERE owner_id = $1', [userId]);
  return rows[0] || null;
};

// Earnings = sum of rental_fee from completed bookings; balance = earnings − payouts.
const computeBalance = async (shopId) => {
  const { rows: [earn] } = await db.query(
    `SELECT COALESCE(SUM(rental_fee), 0)::numeric AS total
     FROM bookings WHERE shop_id = $1 AND status = 'completed'`,
    [shopId]
  );
  const { rows: [paid] } = await db.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM payouts WHERE shop_id = $1`,
    [shopId]
  );
  const totalEarned = Number(earn.total);
  const totalPaidOut = Number(paid.total);
  return { totalEarned, totalPaidOut, balance: Number((totalEarned - totalPaidOut).toFixed(2)) };
};

// GET /wallet
const getWallet = async (req, res, next) => {
  try {
    const shop = await getShop(req.user.id);
    if (!shop) return error(res, 'Shop not found', 404);

    const totals = await computeBalance(shop.id);
    const { rows: payouts } = await db.query(
      `SELECT id, amount, status, created_at FROM payouts WHERE shop_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [shop.id]
    );

    return success(res, { ...totals, bank_account: shop.bank_account, payouts });
  } catch (err) {
    next(err);
  }
};

// POST /wallet/withdraw  { amount }
const requestWithdraw = async (req, res, next) => {
  try {
    const shop = await getShop(req.user.id);
    if (!shop) return error(res, 'Shop not found', 404);
    if (!shop.bank_account) return error(res, 'Add your bank details before withdrawing', 422);

    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return error(res, 'Enter a valid amount', 422);

    const { balance } = await computeBalance(shop.id);
    if (amount > balance) return error(res, 'Amount exceeds available balance', 422);

    const { rows } = await db.query(
      `INSERT INTO payouts (shop_id, amount, status) VALUES ($1, $2, 'paid') RETURNING *`,
      [shop.id, amount.toFixed(2)]
    );

    const totals = await computeBalance(shop.id);
    return success(res, { payout: rows[0], ...totals }, 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { getWallet, requestWithdraw };
