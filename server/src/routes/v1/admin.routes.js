const express = require('express');
const router = express.Router();
const adminCtrl = require('../../controllers/admin/admin.controller');
const { authenticate, requireRole } = require('../../middlewares/auth');

router.use(authenticate, requireRole('admin'));
router.get('/queue', adminCtrl.getQueue);

module.exports = router;
