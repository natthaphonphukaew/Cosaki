import api from './client';
export const uploadEvidence = (formData)            => api.post('/disputes/evidence', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const createDispute  = (booking_id, reason)  => api.post('/disputes', { booking_id, reason });
