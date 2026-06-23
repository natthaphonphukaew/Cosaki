const express = require('express');
const passport = require('passport');
const router = express.Router();

const authController = require('../../controllers/auth/auth.controller');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const {
  sendOTPRules,
  verifyOTPRules,
  refreshTokenRules,
} = require('../../validators/auth.validator');

// Phone / OTP
router.post('/send-otp', sendOTPRules, validate, authController.sendOTP);
router.post('/verify-otp', verifyOTPRules, validate, authController.verifyOTP);
router.post('/refresh', refreshTokenRules, validate, authController.refreshToken);

// Current user
router.get('/me', authenticate, authController.getMe);

// Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  authController.oauthCallback
);

// Facebook OAuth
router.get(
  '/facebook',
  passport.authenticate('facebook', { scope: ['email'], session: false })
);
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login', session: false }),
  authController.oauthCallback
);

module.exports = router;
