const express = require('express');
const router = express.Router();

router.use('/auth',     require('./auth.routes'));
router.use('/users',    require('./user.routes'));
router.use('/shops',    require('./shop.routes'));
router.use('/items',    require('./item.routes'));
router.use('/bookings', require('./booking.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/kyc',      require('./kyc.routes'));
router.use('/disputes', require('./dispute.routes'));
router.use('/',         require('./consent.routes'));

module.exports = router;
