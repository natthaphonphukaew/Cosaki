import api from './client';
export const createCharge = (booking_id, shipping_address_id = null, token = 'mock_token') =>
  api.post('/payments/charge', { booking_id, token, shipping_address_id });
