import api from './client';
export const uploadEvidence      = (formData)            => api.post('/disputes/evidence', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const createDispute       = (booking_id, reason)  => api.post('/disputes', { booking_id, reason });
export const getDisputeByBooking = (bookingId)           => api.get(`/disputes/by-booking/${bookingId}`);
export const resolveDispute      = (id, data)            => api.patch(`/disputes/${id}/resolve`, data);
