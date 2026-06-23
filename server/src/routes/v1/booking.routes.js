const express = require('express');
const router = express.Router();
const bookingCtrl = require('../../controllers/booking/booking.controller');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const { createBookingRules, updateStatusRules } = require('../../validators/booking.validator');

// Public — payment link lookup
router.get('/by-token/:token', bookingCtrl.getByToken);

// Authenticated
router.use(authenticate);
router.post('/',                  createBookingRules,  validate, bookingCtrl.createBooking);
router.get('/',                                                   bookingCtrl.listBookings);
router.get('/:id',                                                bookingCtrl.getBooking);
router.patch('/:id/status',       updateStatusRules,   validate, bookingCtrl.updateStatus);

module.exports = router;
