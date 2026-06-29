import api from './client';
export const getWallet      = ()       => api.get('/wallet');
export const withdraw       = (amount) => api.post('/wallet/withdraw', { amount });
