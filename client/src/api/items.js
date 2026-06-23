import api from './client';
export const searchItems  = (params)   => api.get('/items', { params });
export const getItem      = (id)       => api.get(`/items/${id}`);
export const createItem   = (data)     => api.post('/shops/me/items', data);
export const updateItem   = (id, data) => api.patch(`/shops/me/items/${id}`, data);
export const deleteItem   = (id)       => api.delete(`/shops/me/items/${id}`);
export const listMyItems  = ()         => api.get('/shops/me/items');
