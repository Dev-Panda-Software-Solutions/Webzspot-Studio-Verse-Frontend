import api from './axios'

export const login = (data) => api.post('/auth/login', data)
export const logout = () => api.post('/auth/logout')
export const signup = (data) => api.post('/auth/signup', data)
export const getMe = () => api.get('/auth/me')
export const changePassword = (data) => api.put('/auth/change-password', data)
