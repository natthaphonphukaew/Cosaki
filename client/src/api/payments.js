import api from './client';
export const createCharge = (booking_id, pay_mode = 'full', shipping_address = null, token = 'mock_token') =>
  api.post('/payments/charge', { booking_id, token, pay_mode, shipping_address });
export const payBalance   = (booking_id) => api.post(`/payments/${booking_id}/balance`, {});
