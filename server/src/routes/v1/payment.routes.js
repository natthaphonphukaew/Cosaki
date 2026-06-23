const express = require('express');
const router = express.Router();
const paymentCtrl = require('../../controllers/payment/payment.controller');
const { authenticate, requireRole } = require('../../middlewares/auth');

// Webhook — no auth (signature verified inside controller)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentCtrl.handleWebhook);

router.use(authenticate);
router.post('/charge', paymentCtrl.createCharge);
router.patch('/:paymentId/release', requireRole('admin'), paymentCtrl.releaseEscrow);

module.exports = router;
