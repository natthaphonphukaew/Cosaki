const crypto = require('crypto');
const db = require('../../config/db');
const { success, error } = require('../../utils/response');
const { notify, shopOwnerId } = require('../../services/notification/notification.service');

// POST /payments/charge — create a charge via Omise (placeholder)
const createCharge = async (req, res, next) => {
  try {
    const { booking_id, token } = req.body;

    const { rows: bookings } = await db.query(
      'SELECT * FROM bookings WHERE id = $1 AND renter_id = $2',
      [booking_id, req.user.id]
    );
    if (!bookings.length) return error(res, 'Booking not found', 404);

    const booking = bookings[0];
    if (booking.status !== 'pending_payment') {
      return error(res, 'Booking is not awaiting payment', 422);
    }

    // TODO: replace with real Omise SDK call
    // const charge = await omise.charges.create({ amount: booking.total_amount * 100, currency: 'thb', card: token });
    const mockGatewayRef = `ch_mock_${Date.now()}`;

    const { rows } = await db.query(
      `INSERT INTO payments (booking_id, gateway_ref, amount, escrow_status, paid_at)
       VALUES ($1, $2, $3, 'held', NOW()) RETURNING *`,
      [booking_id, mockGatewayRef, booking.total_amount]
    );

    // Advance booking to escrowed
    await db.query(
      `UPDATE bookings SET status = 'escrowed', updated_at = NOW() WHERE id = $1`,
      [booking_id]
    );

    // Notify the shop owner that payment cleared and it's time to ship.
    const ownerId = await shopOwnerId(booking.shop_id);
    await notify(ownerId, 'payment_received', 'Payment received',
      'Funds are held in escrow — ship the item to start the rental.', booking_id);

    return success(res, { payment: rows[0] }, 201);
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

module.exports = { createCharge, handleWebhook, releaseEscrow };
