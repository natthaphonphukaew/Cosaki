import api from './client';

export const getAddresses = () => api.get('/users/me/addresses');
export const addAddress = (data) => api.post('/users/me/addresses', data);
export const updateAddress = (id, data) => api.put(`/users/me/addresses/${id}`, data);
export const deleteAddress = (id) => api.delete(`/users/me/addresses/${id}`);
export const setDefaultAddress = (id) => api.post(`/users/me/addresses/${id}/default`);
