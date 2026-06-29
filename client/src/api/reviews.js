import api from './client';
export const createReview   = (bookingId, data) => api.post(`/bookings/${bookingId}/reviews`, data);
export const getShopReviews = (shopId)          => api.get(`/shops/${shopId}/reviews`);
