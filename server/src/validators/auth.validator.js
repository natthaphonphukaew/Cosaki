const { body } = require('express-validator');

const sendOTPRules = [
  body('phone')
    .trim()
    .matches(/^\+?[0-9]{9,15}$/)
    .withMessage('Invalid phone number'),
];

const verifyOTPRules = [
  body('phone')
    .trim()
    .matches(/^\+?[0-9]{9,15}$/)
    .withMessage('Invalid phone number'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit code'),
];

const refreshTokenRules = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

module.exports = { sendOTPRules, verifyOTPRules, refreshTokenRules };
