import api from './client';
export const uploadKYC      = (formData) => api.post('/kyc/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getKYCStatus   = ()             => api.get('/kyc/status');
export const requestParentConsent = (parent_phone) => api.post('/kyc/parent-consent', { parent_phone });
export const getConsent     = (token)        => api.get(`/consent/${token}`);
export const respondConsent = (token, action) => api.post(`/consent/${token}/approve`, { action });
