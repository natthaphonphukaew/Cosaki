const express = require('express');
const multer = require('multer');
const router = express.Router();
const disputeCtrl = require('../../controllers/dispute/dispute.controller');
const { authenticate, requireRole } = require('../../middlewares/auth');
const { body } = require('express-validator');
const validate = require('../../middlewares/validate');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
});

router.use(authenticate);

// Evidence
router.post(
  '/evidence',
  upload.array('files', 10),
  [body('booking_id').isUUID(), body('stage').isIn(['pre_ship', 'unboxing'])],
  validate,
  disputeCtrl.uploadEvidence
);

// Disputes
router.post(
  '/',
  [body('booking_id').isUUID(), body('reason').notEmpty().isLength({ max: 1000 })],
  validate,
  disputeCtrl.createDispute
);

router.get('/', requireRole('admin'), disputeCtrl.listDisputes);

router.patch(
  '/:id/resolve',
  requireRole('admin'),
  [
    body('resolution').isIn(['resolved_shop', 'resolved_renter']),
    body('compensation_amount').optional().isFloat({ min: 0 }),
  ],
  validate,
  disputeCtrl.resolveDispute
);

module.exports = router;
