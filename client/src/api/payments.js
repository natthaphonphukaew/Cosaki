import api from './client';
export const createCharge   = (booking_id, token) => api.post('/payments/charge', { booking_id, token });
