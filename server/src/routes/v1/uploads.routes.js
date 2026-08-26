const express = require('express');
const multer = require('multer');
const router = express.Router();
const uploadCtrl = require('../../controllers/upload/upload.controller');
const { authenticate } = require('../../middlewares/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB — cropped images are small
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files allowed'));
    }
    cb(null, true);
  },
});

router.use(authenticate);
router.post('/', upload.single('image'), uploadCtrl.uploadImage);

module.exports = router;
