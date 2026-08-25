import api from './axios'

export const getPaymentsForBill = (billId) => api.get(`/payments/bill/${billId}`)
export const getPaymentById = (id) => api.get(`/payments/${id}`)
export const createPayment = (data) => api.post('/payments', data)
