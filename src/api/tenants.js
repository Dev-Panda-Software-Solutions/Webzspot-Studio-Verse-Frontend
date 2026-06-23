import api from './axios'

export const getTenants = (params) => api.get('/tenants', { params })
export const getTenantById = (id) => api.get(`/tenants/${id}`)
export const createTenant = (data) => api.post('/tenants', data)
export const updateTenant = (id, data) => api.put(`/tenants/${id}`, data)
export const deleteTenant = (id) => api.delete(`/tenants/${id}`)

export const getTenantSettings = (tenantId) => api.get(`/tenant-settings/${tenantId}`)
export const updateTenantSettings = (tenantId, data) => api.put(`/tenant-settings/${tenantId}`, data)

export const unlockAccount = (data) => api.post('/super-admins/unlock-account', data)
export const resetPassword = (data) => api.post('/super-admins/reset-password', data)
