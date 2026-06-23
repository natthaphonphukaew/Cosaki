import api from './client';
export const uploadKYC  = (formData) => api.post('/kyc/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getKYCStatus = ()       => api.get('/kyc/status');
