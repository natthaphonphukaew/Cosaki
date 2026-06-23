const { body, param } = require('express-validator');

const BOOKING_STATUSES = [
  'draft','pending_kyc','pending_payment','escrowed',
  'shipped','returned','disputed','completed','cancelled',
];

const createBookingRules = [
  body('item_id').isUUID().withMessage('item_id must be a valid UUID'),
  body('rental_start').isDate().withMessage('rental_start must be YYYY-MM-DD'),
  body('rental_end')
    .isDate()
    .withMessage('rental_end must be YYYY-MM-DD')
    .custom((val, { req }) => {
      if (new Date(val) <= new Date(req.body.rental_start)) {
        throw new Error('rental_end must be after rental_start');
      }
      return true;
    }),
  body('notes').optional().isLength({ max: 500 }),
];

const updateStatusRules = [
  param('id').isUUID(),
  body('status').isIn(BOOKING_STATUSES).withMessage('Invalid status'),
];

module.exports = { createBookingRules, updateStatusRules };
