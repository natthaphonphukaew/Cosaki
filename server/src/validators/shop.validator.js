const { body } = require('express-validator');

const createShopRules = [
  body('shop_name').trim().notEmpty().isLength({ max: 150 }).withMessage('shop_name required (max 150)'),
  body('description').optional().isLength({ max: 1000 }),
  body('location').optional().trim().isLength({ max: 120 }),
  body('categories').optional().isArray(),
  body('logo_url').optional().isString(),
  body('cover_url').optional().isString(),
];

const updateShopRules = [
  body('shop_name').optional().trim().isLength({ max: 150 }),
  body('description').optional().isLength({ max: 1000 }),
  body('location').optional().trim().isLength({ max: 120 }),
  body('categories').optional().isArray(),
  body('logo_url').optional().isString(),
  body('cover_url').optional().isString(),
  body('bank_account').optional().isObject(),
  body('bank_account.bank').optional().isString(),
  body('bank_account.account_name').optional().isString(),
  body('bank_account.account_number').optional().isString(),
];

const createItemRules = [
  body('name').trim().notEmpty().isLength({ max: 200 }).withMessage('name required'),
  body('test_rate').isFloat({ min: 0 }).withMessage('test_rate must be a positive number'),
  body('private_rate').optional().isFloat({ min: 0 }),
  body('shipping_fee').optional().isFloat({ min: 0 }),
  body('sizes').optional().isArray(),
  body('fandom').optional().trim().isLength({ max: 100 }),
  body('character').optional().trim().isLength({ max: 100 }),
  body('image_urls').optional().isArray(),
];

const updateItemRules = [
  body('name').optional().trim().isLength({ max: 200 }),
  body('test_rate').optional().isFloat({ min: 0 }),
  body('private_rate').optional().isFloat({ min: 0 }),
  body('shipping_fee').optional().isFloat({ min: 0 }),
  body('sizes').optional().isArray(),
  body('is_available').optional().isBoolean(),
  body('image_urls').optional().isArray(),
];

module.exports = { createShopRules, updateShopRules, createItemRules, updateItemRules };
