import api from './client';

export const createCharge = (booking_id, shipping_address_id = null, token = 'mock_token') =>
  api.post('/payments/charge', { booking_id, token, shipping_address_id });

// Phase-0 manual PromptPay.
export const getPromptPayQr = (bookingId) => api.get(`/payments/${bookingId}/qr`);
export const submitSlip = (bookingId, slip_url) =>
  api.post(`/payments/${bookingId}/slip`, { slip_url });
