const express = require('express');
const router  = express.Router();
const userCtrl = require('../../controllers/user/user.controller');
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
router.get('/:id/trust', userCtrl.getTrustScore);

module.exports = router;
