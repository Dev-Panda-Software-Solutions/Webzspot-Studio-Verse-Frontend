import api from './axios'
import { apiUrl, mediaViewUrl } from '../utils/apiUrl'

export const getMediaByEvent = (eventId, params) => api.get(`/uploaded-media/event/${eventId}`, { params })

// Do NOT set Content-Type manually for FormData — axios auto-sets it with the correct boundary
export const uploadMedia = (formData, onProgress) => api.post('/uploaded-media/upload', formData, {
  onUploadProgress: onProgress,
})

export const LARGE_UPLOAD_THRESHOLD = 100 * 1024 * 1024
export const LARGE_UPLOAD_MAX_SIZE = 5 * 1024 * 1024 * 1024
const CHUNK_SIZE = 8 * 1024 * 1024

export const uploadLargeMedia = async ({ eventId, file, onProgress }) => {
  if (file.size > LARGE_UPLOAD_MAX_SIZE) {
    throw new Error('File too large. Maximum allowed is 5GB per file.')
  }

  const init = await api.post('/uploaded-media/large/initiate', {
    event_id: eventId,
    file_name: file.name,
    file_type: file.type || 'application/octet-stream',
    file_size: file.size,
  })

  const session = init.data
  const parts = []
  let uploaded = 0

  try {
    const totalParts = Math.ceil(file.size / CHUNK_SIZE)
    for (let index = 0; index < totalParts; index += 1) {
      const start = index * CHUNK_SIZE
      const end = Math.min(file.size, start + CHUNK_SIZE)
      const chunk = file.slice(start, end)
      const partNumber = index + 1

      const result = await api.put('/uploaded-media/large/part', chunk, {
        params: {
          event_id: eventId,
          key: session.key,
          upload_id: session.upload_id,
          part_number: partNumber,
        },
        headers: { 'Content-Type': 'application/octet-stream' },
        timeout: 0,
        onUploadProgress: (e) => {
          const current = uploaded + (e.loaded || 0)
          onProgress?.({ loaded: current, total: file.size })
        },
      })

      parts.push(result.data)
      uploaded += chunk.size
      onProgress?.({ loaded: uploaded, total: file.size })
    }

    return api.post('/uploaded-media/large/complete', {
      event_id: eventId,
      stage_id: session.stage_id,
      key: session.key,
      upload_id: session.upload_id,
      file_name: file.name,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      parts,
    })
  } catch (err) {
    await api.post('/uploaded-media/large/abort', {
      event_id: eventId,
      stage_id: session.stage_id,
      key: session.key,
      upload_id: session.upload_id,
    }).catch(() => {})
    throw err
  }
}
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
