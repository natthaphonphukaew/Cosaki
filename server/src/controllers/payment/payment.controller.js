const crypto = require('crypto');
const db = require('../../config/db');
const { success, error } = require('../../utils/response');
const { notify, shopOwnerId } = require('../../services/notification/notification.service');

// POST /payments/charge — mock PromptPay/Omise charge. Supports split payment:
//   pay_mode 'full'    → charge the whole total → escrowed.
//   pay_mode 'deposit' → charge only the ฿100 booking fee → "reserved"
//                        (stays pending_payment with a balance due).
const createCharge = async (req, res, next) => {
  try {
    const { booking_id, token, pay_mode = 'full' } = req.body;

    const { rows: bookings } = await db.query(
      'SELECT * FROM bookings WHERE id = $1 AND renter_id = $2',
      [booking_id, req.user.id]
    );
    if (!bookings.length) return error(res, 'Booking not found', 404);

    const booking = bookings[0];
    if (booking.status !== 'pending_payment' || Number(booking.amount_paid) > 0) {
      return error(res, 'Booking is not awaiting payment', 422);
    }

    const { rows: conflicts } = await db.query(
      `SELECT id FROM bookings
       WHERE item_id = $1
         AND status NOT IN ('cancelled', 'completed', 'draft', 'pending_kyc', 'pending_payment')
         AND rental_start < $3 AND rental_end > $2
         AND id != $4`,
      [booking.item_id, booking.rental_start, booking.rental_end, booking.id]
    );

    if (conflicts.length > 0) {
      await db.query(`UPDATE bookings SET status = 'cancelled' WHERE id = $1`, [booking.id]);
      return error(res, 'ขออภัย คิวนี้ถูกชำระเงินตัดหน้าไปแล้ว (คิวถูกยกเลิกอัตโนมัติ)', 409);
    }

    const total  = Number(booking.total_amount);
    const charge = pay_mode === 'deposit' ? Number(booking.booking_fee) : total;
    const mockGatewayRef = `ch_mock_${Date.now()}`;

    const { rows } = await db.query(
      `INSERT INTO payments (booking_id, gateway_ref, amount, escrow_status, paid_at)
       VALUES ($1, $2, $3, 'held', NOW()) RETURNING *`,
      [booking_id, mockGatewayRef, charge]
    );

    const amountPaid = charge;
    const balanceDue = Number((total - amountPaid).toFixed(2));
    const fullyPaid  = balanceDue <= 0;

    await db.query(
      `UPDATE bookings SET
         pay_mode = $1, amount_paid = $2, balance_due = $3,
         status = CASE WHEN $4 THEN 'escrowed'::booking_status ELSE 'pending_payment'::booking_status END,
         updated_at = NOW()
       WHERE id = $5`,
      [pay_mode, amountPaid, balanceDue, fullyPaid, booking_id]
    );

    if (fullyPaid) {
      const ownerId = await shopOwnerId(booking.shop_id);
      await notify(ownerId, 'payment_received', 'Payment received',
        'Funds are held in escrow — ship the item to start the rental.', booking_id);
    }

    return success(res, { payment: rows[0], balance_due: balanceDue, fully_paid: fullyPaid }, 201);
  } catch (err) {
    next(err);
  }
};

// POST /payments/:bookingId/balance — pay the remaining balance of a reserved booking.
const payBalance = async (req, res, next) => {
  try {
    const { rows: bookings } = await db.query(
      'SELECT * FROM bookings WHERE id = $1 AND renter_id = $2',
      [req.params.bookingId, req.user.id]
    );
    if (!bookings.length) return error(res, 'Booking not found', 404);
    const booking = bookings[0];
    if (Number(booking.balance_due) <= 0 || booking.status !== 'pending_payment') {
      return error(res, 'ไม่มียอดค้างชำระ', 422);
    }

    const mockGatewayRef = `ch_mock_${Date.now()}`;
    await db.query(
      `INSERT INTO payments (booking_id, gateway_ref, amount, escrow_status, paid_at)
       VALUES ($1, $2, $3, 'held', NOW())`,
      [booking.id, mockGatewayRef, booking.balance_due]
    );
    await db.query(
      `UPDATE bookings SET amount_paid = total_amount, balance_due = 0,
                          status = 'escrowed', updated_at = NOW()
       WHERE id = $1`,
      [booking.id]
    );

    const ownerId = await shopOwnerId(booking.shop_id);
    await notify(ownerId, 'payment_received', 'Payment received',
      'ชำระครบแล้ว — จัดส่งสินค้าเพื่อเริ่มการเช่า', booking.id);

    return success(res, { message: 'ชำระยอดคงเหลือสำเร็จ' });
  } catch (err) {
    next(err);
  }
};

// POST /payments/webhook — Omise webhook handler
const handleWebhook = async (req, res, next) => {
  try {
    // Verify webhook signature
    const signature = req.headers['omise-signature'];
    const expected = crypto
      .createHmac('sha256', process.env.OMISE_WEBHOOK_SECRET || '')
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (process.env.NODE_ENV === 'production' && signature !== expected) {
      return error(res, 'Invalid webhook signature', 401);
    }

    const { key, data } = req.body;

    if (key === 'charge.complete') {
      const { rows: payments } = await db.query(
        'SELECT * FROM payments WHERE gateway_ref = $1',
        [data.id]
      );
      if (payments.length) {
        await db.query(
          `UPDATE payments SET escrow_status = 'held', paid_at = NOW() WHERE id = $1`,
          [payments[0].id]
        );
        await db.query(
          `UPDATE bookings SET status = 'escrowed', updated_at = NOW() WHERE id = $1`,
          [payments[0].booking_id]
        );
      }
    }

    if (key === 'charge.fail') {
      const { rows: payments } = await db.query(
        'SELECT * FROM payments WHERE gateway_ref = $1',
        [data.id]
      );
      if (payments.length) {
        await db.query(
          `UPDATE bookings SET status = 'pending_payment', updated_at = NOW() WHERE id = $1`,
          [payments[0].booking_id]
        );
      }
    }

    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
};

// POST /payments/:paymentId/release — admin releases escrow to shop
const releaseEscrow = async (req, res, next) => {
  try {
    const { rows: payments } = await db.query(
      `UPDATE payments
       SET escrow_status = 'released_to_shop', released_at = NOW()
       WHERE id = $1 AND escrow_status = 'held'
       RETURNING *`,
      [req.params.paymentId]
    );
    if (!payments.length) return error(res, 'Payment not found or already released', 404);

    await db.query(
      `UPDATE bookings SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [payments[0].booking_id]
    );

    return success(res, { payment: payments[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { createCharge, payBalance, handleWebhook, releaseEscrow };
