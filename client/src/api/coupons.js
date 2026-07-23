import api from './client';

export const getMyCoupons = () => api.get('/users/me/coupons');
