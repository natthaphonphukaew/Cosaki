import api from './client';
export const createBooking  = (data)           => api.post('/bookings', data);
export const listBookings   = (params)         => api.get('/bookings', { params });
export const getBooking     = (id)             => api.get(`/bookings/${id}`);
export const updateStatus   = (id, status)     => api.patch(`/bookings/${id}/status`, { status });
export const getByToken     = (token)          => api.get(`/bookings/by-token/${token}`);
export const applyCoupon    = (id, code)       => api.post(`/bookings/${id}/coupon`, { code });
export const cancelBooking  = (id)             => api.post(`/bookings/${id}/cancel`, {});
export const rescheduleBooking = (id, rental_start, rental_end) => api.patch(`/bookings/${id}/reschedule`, { rental_start, rental_end });
