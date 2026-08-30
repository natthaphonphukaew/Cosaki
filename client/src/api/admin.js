import api from './client';

// Phase-0 back office (role: admin).
export const getAdminQueue = () => api.get('/admin/queue');
export const confirmSlip   = (bookingId) => api.patch(`/payments/${bookingId}/confirm-slip`);
export const rejectSlip    = (bookingId, reason) => api.patch(`/payments/${bookingId}/reject-slip`, { reason });
export const releasePayout = (paymentId) => api.patch(`/payments/${paymentId}/release`);
