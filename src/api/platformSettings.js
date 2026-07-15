import api from './axios'

export const getPlatformSettings = () => api.get('/platform-settings')
export const updatePlatformSettings = (data) => api.put('/platform-settings', data)
