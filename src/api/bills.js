import api from './axios'

export const getBills = (params) => api.get('/bills', { params })
export const getBillById = (id) => api.get(`/bills/${id}`)
export const confirmQuotationToBill = (quotation_id) => api.post('/bills', { quotation_id })
export const updateBill = (id, data) => api.put(`/bills/${id}`, data)
