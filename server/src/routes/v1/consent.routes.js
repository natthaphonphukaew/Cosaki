const express = require('express');
const router  = express.Router();
const consentCtrl = require('../../controllers/booking/parentConsent.controller');
const { authenticate } = require('../../middlewares/auth');
const { body, param } = require('express-validator');
const validate = require('../../middlewares/validate');

// Authenticated — renter requests consent
router.post('/bookings/:id/parent-consent',
  authenticate,
  [body('parent_phone').matches(/^\+?[0-9]{9,15}$/).withMessage('Invalid phone')],
  validate,
  consentCtrl.requestConsent
);

// Public — parent opens link
router.get('/consent/:token',  consentCtrl.getConsentPage);
router.post('/consent/:token/approve',
  [body('action').isIn(['approved','rejected'])],
  validate,
  consentCtrl.approveConsent
);

module.exports = router;
