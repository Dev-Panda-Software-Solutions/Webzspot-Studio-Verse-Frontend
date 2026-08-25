import api from './axios'

export const getStudioServices = (params) => api.get('/studio-services', { params })
export const createStudioService = (data) => api.post('/studio-services', data)
export const updateStudioService = (id, data) => api.put(`/studio-services/${id}`, data)
export const deleteStudioService = (id) => api.delete(`/studio-services/${id}`)
export const restoreStudioService = (id) => api.put(`/studio-services/${id}/restore`)
