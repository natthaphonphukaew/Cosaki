const express = require('express');
const router = express.Router();
const itemCtrl = require('../../controllers/shop/item.controller');

// Public item endpoints
router.get('/',    itemCtrl.searchItems);   // GET /items?q=&fandom=&page=&limit=
router.get('/:id', itemCtrl.getItem);       // GET /items/:id

module.exports = router;
