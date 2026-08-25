import api from './axios'

export const getAllPayments = (params) => api.get('/payments', { params })
export const getPaymentsForBill = (billId) => api.get(`/payments/bill/${billId}`)
export const getPaymentById = (id) => api.get(`/payments/${id}`)
export const createPayment = (data) => api.post('/payments', data)
