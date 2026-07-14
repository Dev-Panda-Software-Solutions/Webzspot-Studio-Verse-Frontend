import api from './axios'

export const getPlans = (params) => api.get('/subscription-plans', { params })
export const getPlanById = (id) => api.get(`/subscription-plans/${id}`)
export const createPlan = (data) => api.post('/subscription-plans', data)
export const updatePlan = (id, data) => api.put(`/subscription-plans/${id}`, data)
export const deletePlan = (id) => api.delete(`/subscription-plans/${id}`)
export const hardDeletePlan = (id) => api.delete(`/subscription-plans/hard/${id}`)
export const reorderPlans = (orderedIds) => api.post('/subscription-plans/reorder', { orderedIds })
export const setSpecialAccess = (id, cutoff_date) => api.put(`/subscription-plans/${id}/special-access`, { cutoff_date })
