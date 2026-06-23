import api from './axios'

export const getEvents = (params) => api.get('/events', { params })
export const getEventById = (id) => api.get(`/events/${id}`)
export const createEvent = (data) => api.post('/events', data)
export const updateEvent = (id, data) => api.put(`/events/${id}`, data)
export const deleteEvent = (id) => api.delete(`/events/${id}`)

export const getEventUsers = (eventId) => api.get(`/event-user-mapping/event/${eventId}`)
export const assignUserToEvent = (data) => api.post('/event-user-mapping', data)
export const updateEventUserMapping = (id, data) => api.patch(`/event-user-mapping/${id}`, data)
export const removeUserFromEvent = (id) => api.delete(`/event-user-mapping/${id}`)

export const getEventFavouritesGrouped = (eventId) => api.get(`/favourites/event/${eventId}/grouped`)
export const getEventStats = () => api.get('/events/stats')
export const getDashboardAnalytics = () => api.get('/events/analytics')
