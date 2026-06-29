const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/payout/payout.controller');
const { authenticate, requireRole } = require('../../middlewares/auth');

router.use(authenticate, requireRole('shop_admin', 'admin'));
router.get('/',          ctrl.getWallet);
router.post('/withdraw', ctrl.requestWithdraw);

module.exports = router;
