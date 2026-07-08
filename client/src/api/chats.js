import api from './client';
export const openChat        = (shop_id)        => api.post('/chats', { shop_id });
export const listChats       = ()               => api.get('/chats');
export const chatUnreadCount = ()               => api.get('/chats/unread-count');
export const listMessages    = (id)             => api.get(`/chats/${id}/messages`);
export const sendMessage     = (id, body, booking_id) => api.post(`/chats/${id}/messages`, { body, booking_id });
