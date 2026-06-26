import api from './axios'
import { apiUrl, mediaViewUrl } from '../utils/apiUrl'

export const getMediaByEvent = (eventId, params) => api.get(`/uploaded-media/event/${eventId}`, { params })

// Do NOT set Content-Type manually for FormData — axios auto-sets it with the correct boundary
export const uploadMedia = (formData, onProgress) => api.post('/uploaded-media/upload', formData, {
  onUploadProgress: onProgress,
})
export const deleteMedia = (id) => api.delete(`/uploaded-media/${id}`)

export const getMediaToken = (mediaId) => api.get(`/media/token/${mediaId}`)
export const getMediaViewUrl = (token) => mediaViewUrl(token)
export const downloadFavouritesZip = (eventId, userId) =>
  apiUrl(`media/download-zip/${eventId}/${userId}`)
export const downloadStudioFavouritesZip = (eventId) =>
  apiUrl(`media/download-studio-zip/${eventId}`)

export const uploadProfileImage = (formData) => api.post('/upload/profile', formData)
export const uploadCoverImage = (formData) => api.post('/upload/cover', formData)
export const uploadWatermark = (formData) => api.post('/upload/watermark', formData)
