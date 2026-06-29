const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/notification/notification.controller');
const { authenticate } = require('../../middlewares/auth');

router.use(authenticate);
router.get('/',              ctrl.listNotifications);
router.get('/unread-count',  ctrl.unreadCount);
router.patch('/:id/read',    ctrl.markRead);
router.post('/read-all',     ctrl.markAllRead);

module.exports = router;
