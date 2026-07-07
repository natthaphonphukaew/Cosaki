import api from './client';
export const createCharge = (booking_id, pay_mode = 'full', token = 'mock_token') =>
  api.post('/payments/charge', { booking_id, token, pay_mode });
export const payBalance   = (booking_id) => api.post(`/payments/${booking_id}/balance`, {});
