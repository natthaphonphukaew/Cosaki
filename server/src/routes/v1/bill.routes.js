const express = require('express');
const router = express.Router();
const billCtrl = require('../../controllers/bill/bill.controller');
const { authenticate } = require('../../middlewares/auth');

router.use(authenticate);
router.get('/',        billCtrl.listBills);   // ?as=shop for issued bills
router.post('/:id/pay', billCtrl.payBill);

module.exports = router;
