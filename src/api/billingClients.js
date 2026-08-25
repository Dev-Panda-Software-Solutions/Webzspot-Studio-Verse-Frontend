import api from './axios'

export const getBillingClients = (params) => api.get('/billing-clients', { params })
export const createBillingClient = (data) => api.post('/billing-clients', data)
export const updateBillingClient = (id, data) => api.put(`/billing-clients/${id}`, data)
