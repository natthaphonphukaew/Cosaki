const db = require('../../config/db');
const { success, error } = require('../../utils/response');
const { notify, shopOwnerId } = require('../../services/notification/notification.service');

// Am I a party of this conversation? Returns { convo, meIsRenter } or null.
const getMyConvo = async (userId, convoId) => {
  const { rows } = await db.query(
    `SELECT c.*, s.owner_id AS shop_owner_id, s.shop_name, s.logo_url,
            u.display_name AS renter_name, u.avatar_url AS renter_avatar
     FROM conversations c
     JOIN shops s ON s.id = c.shop_id
     JOIN users u ON u.id = c.renter_id
     WHERE c.id = $1`,
    [convoId]
  );
  if (!rows.length) return null;
  const convo = rows[0];
  if (convo.renter_id === userId) return { convo, meIsRenter: true };
  if (convo.shop_owner_id === userId) return { convo, meIsRenter: false };
  return null;
};

// POST /chats { shop_id } — renter opens (or reuses) a conversation with a shop.
const openConversation = async (req, res, next) => {
  try {
    const { shop_id } = req.body;
    const { rows: shops } = await db.query('SELECT id, owner_id FROM shops WHERE id = $1', [shop_id]);
    if (!shops.length) return error(res, 'Shop not found', 404);
    if (shops[0].owner_id === req.user.id) return error(res, 'แชทกับร้านตัวเองไม่ได้', 422);

    const { rows } = await db.query(
      `INSERT INTO conversations (shop_id, renter_id) VALUES ($1, $2)
       ON CONFLICT (shop_id, renter_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [shop_id, req.user.id]
    );
    return success(res, { conversation: rows[0] }, 201);
  } catch (err) {
    next(err);
  }
};

// GET /chats — my conversations (both roles) with last message + unread count.
const listConversations = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id, c.shop_id, c.renter_id, c.updated_at,
              s.shop_name, s.logo_url, s.owner_id AS shop_owner_id,
              u.display_name AS renter_name, u.avatar_url AS renter_avatar,
              (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_at,
              (SELECT COUNT(*)::int FROM messages m
                WHERE m.conversation_id = c.id AND m.is_read = FALSE AND m.sender_id <> $1) AS unread
       FROM conversations c
       JOIN shops s ON s.id = c.shop_id
       JOIN users u ON u.id = c.renter_id
       WHERE c.renter_id = $1 OR s.owner_id = $1
       ORDER BY COALESCE((SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1), c.updated_at) DESC`,
      [req.user.id]
    );
    const conversations = rows.map((c) => ({
      ...c,
      // What the current user should see as the counterpart.
      counterpart_name: c.shop_owner_id === req.user.id ? c.renter_name : c.shop_name,
      counterpart_avatar: c.shop_owner_id === req.user.id ? c.renter_avatar : c.logo_url,
      my_role: c.shop_owner_id === req.user.id ? 'shop' : 'renter',
    }));
    return success(res, { conversations });
  } catch (err) {
    next(err);
  }
};

// GET /chats/unread-count — total unread messages addressed to me.
const unreadCount = async (req, res, next) => {
  try {
    const { rows: [r] } = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       JOIN shops s ON s.id = c.shop_id
       WHERE m.is_read = FALSE AND m.sender_id <> $1
         AND (c.renter_id = $1 OR s.owner_id = $1)`,
      [req.user.id]
    );
    return success(res, { count: r.count });
  } catch (err) {
    next(err);
  }
};

// GET /chats/:id/messages — messages (marks mine-to-read) + order context.
const listMessages = async (req, res, next) => {
  try {
    const mine = await getMyConvo(req.user.id, req.params.id);
    if (!mine) return error(res, 'Conversation not found', 404);
    const { convo } = mine;

    await db.query(
      `UPDATE messages SET is_read = TRUE WHERE conversation_id = $1 AND sender_id <> $2 AND is_read = FALSE`,
      [convo.id, req.user.id]
    );

    const { rows: messages } = await db.query(
      `SELECT m.*, i.name AS booking_item_name, b.status AS booking_status,
              b.rental_start, b.rental_end, b.total_amount
       FROM messages m
       LEFT JOIN bookings b ON b.id = m.booking_id
       LEFT JOIN items i ON i.id = b.item_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC
       LIMIT 200`,
      [convo.id]
    );

    // Order context (PRD §4.2): the renter's active orders with this shop,
    // shown as attachable chips so both sides know which order is discussed.
    const { rows: activeOrders } = await db.query(
      `SELECT b.id, b.status, b.rental_start, b.rental_end, i.name AS item_name
       FROM bookings b JOIN items i ON i.id = b.item_id
       WHERE b.renter_id = $1 AND b.shop_id = $2
         AND b.status NOT IN ('cancelled', 'completed', 'draft')
       ORDER BY b.created_at DESC LIMIT 5`,
      [convo.renter_id, convo.shop_id]
    );

    return success(res, {
      conversation: {
        id: convo.id, shop_id: convo.shop_id, shop_name: convo.shop_name,
        renter_id: convo.renter_id, renter_name: convo.renter_name,
        counterpart_name: mine.meIsRenter ? convo.shop_name : convo.renter_name,
      },
      messages,
      active_orders: activeOrders,
    });
  } catch (err) {
    next(err);
  }
};

// POST /chats/:id/messages { body, booking_id? } — send a message.
const sendMessage = async (req, res, next) => {
  try {
    const { body, booking_id } = req.body;
    if (!body?.trim() && !booking_id) return error(res, 'ข้อความว่าง', 422);

    const mine = await getMyConvo(req.user.id, req.params.id);
    if (!mine) return error(res, 'Conversation not found', 404);
    const { convo, meIsRenter } = mine;

    const { rows } = await db.query(
      `INSERT INTO messages (conversation_id, sender_id, body, booking_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [convo.id, req.user.id, body?.trim() || null, booking_id || null]
    );
    await db.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [convo.id]);

    const recipient = meIsRenter ? convo.shop_owner_id : convo.renter_id;
    const senderName = meIsRenter ? convo.renter_name : convo.shop_name;
    await notify(recipient, 'chat', `ข้อความใหม่จาก ${senderName}`,
      body?.trim()?.slice(0, 80) || '📦 แนบออเดอร์', booking_id || null);

    return success(res, { message: rows[0] }, 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { openConversation, listConversations, unreadCount, listMessages, sendMessage };
