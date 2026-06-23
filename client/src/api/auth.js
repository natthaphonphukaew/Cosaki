import api from './client';
export const sendOTP      = (phone)        => api.post('/auth/send-otp',   { phone });
export const verifyOTP    = (phone, code)  => api.post('/auth/verify-otp', { phone, code });
export const refreshToken = (refreshToken) => api.post('/auth/refresh',    { refreshToken });
export const getMe        = ()             => api.get('/auth/me');
