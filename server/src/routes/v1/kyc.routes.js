const express = require('express');
const multer = require('multer');
const router = express.Router();
const kycCtrl = require('../../controllers/kyc/kyc.controller');
const { authenticate, requireRole } = require('../../middlewares/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files allowed'));
    }
    cb(null, true);
  },
});

router.use(authenticate);

router.post(
  '/upload',
  upload.fields([{ name: 'id_image', maxCount: 1 }, { name: 'selfie', maxCount: 1 }]),
  kycCtrl.uploadKYC
);
router.get('/status', kycCtrl.getKYCStatus);
router.post('/parent-consent', kycCtrl.requestParentConsent);

// Admin only
router.patch('/:kycId/review', requireRole('admin'), kycCtrl.reviewKYC);

module.exports = router;
