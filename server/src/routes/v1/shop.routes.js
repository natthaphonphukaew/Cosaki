const express = require('express');
const router = express.Router();
const shopCtrl = require('../../controllers/shop/shop.controller');
const itemCtrl = require('../../controllers/shop/item.controller');
const { authenticate, requireRole } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const {
  createShopRules, updateShopRules, createItemRules, updateItemRules,
} = require('../../validators/shop.validator');

const isShopAdmin = [authenticate, requireRole('shop_admin', 'admin')];

// ── Shop ──────────────────────────────────────────────────────────────────────
// Any authenticated user may open a shop; createShop promotes them to shop_admin.
router.post('/',      authenticate,   createShopRules,  validate, shopCtrl.createShop);
router.get('/me',     ...isShopAdmin,                             shopCtrl.getMyShop);
router.patch('/me',   ...isShopAdmin, updateShopRules,  validate, shopCtrl.updateShop);
router.get('/:id',    shopCtrl.getShop);   // public

// ── Items (scoped to own shop) ────────────────────────────────────────────────
router.post('/me/items',       ...isShopAdmin, createItemRules, validate, itemCtrl.createItem);
router.get('/me/items',        ...isShopAdmin,                           itemCtrl.listMyItems);
router.patch('/me/items/:id',  ...isShopAdmin, updateItemRules, validate, itemCtrl.updateItem);
router.delete('/me/items/:id', ...isShopAdmin,                           itemCtrl.deleteItem);

module.exports = router;
