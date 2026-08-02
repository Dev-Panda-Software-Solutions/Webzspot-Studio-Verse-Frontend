import api from './axios'

export const createTicket = (data) => api.post('/support-tickets', data)
export const getMyTickets = (params) => api.get('/support-tickets/my-tickets', { params })
export const getAllTickets = (params) => api.get('/support-tickets', { params })
export const getTicketById = (id) => api.get(`/support-tickets/${id}`)
export const updateTicketStatus = (id, status) => api.put(`/support-tickets/${id}/status`, { status })
export const addTicketReply = (id, message) => api.post(`/support-tickets/${id}/reply`, { message })
