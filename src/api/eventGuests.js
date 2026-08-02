import api from './axios'

// Public — no auth. Guest scans the QR code and posts here (event_id + email + selfie file).
export const registerGuest = (formData) => api.post('/event-guests', formData)

// Studio-facing.
export const getGuestsByEvent = (eventId) => api.get(`/event-guests/event/${eventId}`)
