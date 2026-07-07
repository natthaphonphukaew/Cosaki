const express = require('express');
const router = express.Router();
const bookingCtrl = require('../../controllers/booking/booking.controller');
const reviewCtrl = require('../../controllers/review/review.controller');
const couponCtrl = require('../../controllers/coupon/coupon.controller');
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
router.post('/:id/reviews',                                      reviewCtrl.createReview);
router.post('/:id/coupon',                                       couponCtrl.applyCoupon);
router.post('/:id/cancel',                                       bookingCtrl.cancelBooking);
router.patch('/:id/reschedule',                                  bookingCtrl.rescheduleBooking);

module.exports = router;
