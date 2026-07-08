import api from './client';
export const createBill = (bookingId, amount, reason) => api.post(`/bookings/${bookingId}/bill`, { amount, reason });
export const listBills  = (params)                    => api.get('/bills', { params });
export const payBill    = (id)                        => api.post(`/bills/${id}/pay`, {});
