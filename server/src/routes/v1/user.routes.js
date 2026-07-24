const express = require('express');
const router  = express.Router();
const userCtrl = require('../../controllers/user/user.controller');
const addressCtrl = require('../../controllers/user/address.controller');
const { authenticate } = require('../../middlewares/auth');
const { body } = require('express-validator');
const validate = require('../../middlewares/validate');

router.use(authenticate);
router.get('/me',     userCtrl.getMe);
router.patch('/me',
  [body('display_name').optional().trim().isLength({ max: 100 }),
   body('is_minor').optional().isBoolean()],
  validate,
  userCtrl.updateMe
);

// ── Address book (§ renter multi-address) ──────────────────────────────────
const addressRules = [
  body('recipient_name').notEmpty().isLength({ max: 150 }).withMessage('กรุณากรอกชื่อผู้รับ'),
  body('phone').notEmpty().matches(/^\+?[0-9\s-]{9,20}$/).withMessage('เบอร์โทรไม่ถูกต้อง'),
  body('province').notEmpty(),
  body('district').notEmpty(),
  body('subdistrict').notEmpty(),
  body('postal_code').notEmpty(),
  body('detail_line').notEmpty().isLength({ max: 500 }).withMessage('กรุณากรอกที่อยู่'),
  body('label').optional({ nullable: true }).isString(),
  body('is_default').optional().isBoolean(),
];
router.get('/me/addresses',            addressCtrl.listAddresses);
router.post('/me/addresses',           addressRules, validate, addressCtrl.createAddress);
router.patch('/me/addresses/:id',      addressCtrl.updateAddress);
router.delete('/me/addresses/:id',     addressCtrl.deleteAddress);
router.post('/me/addresses/:id/default', addressCtrl.setDefault);

router.get('/:id/trust', userCtrl.getTrustScore);

module.exports = router;
