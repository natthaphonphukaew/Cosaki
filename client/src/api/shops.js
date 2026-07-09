import api from './client';

export const createShop = (data)  => api.post('/shops', data);
export const getMyShop  = ()      => api.get('/shops/me');
export const updateShop = (data)  => api.patch('/shops/me', data);
export const getShop    = (id)    => api.get(`/shops/${id}`);
export const getShopItems     = (id, q)  => api.get(`/shops/${id}/items`, { params: q ? { q } : {} });
export const toggleFollowShop = (id)     => api.post(`/shops/${id}/follow`, {});
export const getFollowState   = (id)     => api.get(`/shops/${id}/follow`);
export const createShopCoupon = (data) => api.post('/shops/me/coupons', data);
export const listShopCoupons  = ()     => api.get('/shops/me/coupons');
export const toggleShopCoupon = (id)   => api.patch(`/shops/me/coupons/${id}`);
