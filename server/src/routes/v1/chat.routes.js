const express = require('express');
const router = express.Router();
const chatCtrl = require('../../controllers/chat/chat.controller');
const { authenticate } = require('../../middlewares/auth');

router.use(authenticate);
router.post('/',              chatCtrl.openConversation);
router.get('/',               chatCtrl.listConversations);
router.get('/unread-count',   chatCtrl.unreadCount);
router.get('/:id/messages',   chatCtrl.listMessages);
router.post('/:id/messages',  chatCtrl.sendMessage);

module.exports = router;
