const express = require('express');
const router = express.Router();
const paymentCtrl = require('../../controllers/payment/payment.controller');
const { authenticate, requireRole } = require('../../middlewares/auth');

// Webhook — no auth (signature verified inside controller)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentCtrl.handleWebhook);

router.use(authenticate);
router.post('/charge', paymentCtrl.createCharge);
router.post('/:bookingId/balance', paymentCtrl.payBalance);

// Phase-0 manual PromptPay: renter fetches QR + attaches slip; admin verifies.
router.get('/:bookingId/qr', paymentCtrl.getPromptPayQr);
router.post('/:bookingId/slip', paymentCtrl.submitSlip);
router.patch('/:bookingId/confirm-slip', requireRole('admin'), paymentCtrl.confirmSlip);
router.patch('/:bookingId/reject-slip', requireRole('admin'), paymentCtrl.rejectSlip);

router.patch('/:paymentId/release', requireRole('admin'), paymentCtrl.releaseEscrow);

module.exports = router;
