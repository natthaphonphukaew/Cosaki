import api from './client';

export const createShop = (data)  => api.post('/shops', data);
export const getMyShop  = ()      => api.get('/shops/me');
export const updateShop = (data)  => api.patch('/shops/me', data);
export const getShop    = (id)    => api.get(`/shops/${id}`);
