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
export const restoreMedia = (id) => api.put(`/uploaded-media/${id}/restore`)
export const hardDeleteMedia = (id) => api.delete(`/uploaded-media/hard/${id}`)

export const getMediaToken = (mediaId) => api.get(`/media/token/${mediaId}`)
export const getMediaViewUrl = (token) => mediaViewUrl(token)

const triggerBlobDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

// onProgress({ percent, speedMBps, etaSec }) — called during download
export const downloadFavouritesZip = async (eventId, userId, filename, onProgress) => {
  let startTime = null
  let lastLoaded = 0
  let lastTime = null

  // Bypass the interceptor (which swallows res.data) by using raw axios
  const { default: axios } = await import('axios')
  const { API_BASE_URL } = await import('../utils/apiUrl')
  const token = JSON.parse(sessionStorage.getItem('sv-auth') || localStorage.getItem('sv-auth') || '{}')?.state?.token

  const res = await axios.get(`${API_BASE_URL}/media/download-zip/${eventId}/${userId}`, {
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    onDownloadProgress: (evt) => {
      if (!onProgress) return
      const now = Date.now()
      if (!startTime) { startTime = now; lastTime = now; lastLoaded = 0 }
      const elapsed = (now - lastTime) / 1000
      const deltaBytes = evt.loaded - lastLoaded
      const speedMBps = elapsed > 0 ? (deltaBytes / 1024 / 1024) / elapsed : 0
      lastLoaded = evt.loaded
      lastTime = now
      const percent = evt.total ? Math.round((evt.loaded / evt.total) * 100) : 0
      const remaining = evt.total ? (evt.total - evt.loaded) : 0
      const etaSec = speedMBps > 0 ? Math.round((remaining / 1024 / 1024) / speedMBps) : null
      onProgress({ percent, speedMBps, etaSec, loaded: evt.loaded, total: evt.total })
    }
  })
  triggerBlobDownload(res.data, filename || `favourites-${userId}.zip`)
}

export const downloadStudioFavouritesZip = async (eventId, filename, onProgress) => {
  let lastLoaded = 0
  let lastTime = null

  const { default: axios } = await import('axios')
  const { API_BASE_URL } = await import('../utils/apiUrl')
  const token = JSON.parse(sessionStorage.getItem('sv-auth') || localStorage.getItem('sv-auth') || '{}')?.state?.token

  const res = await axios.get(`${API_BASE_URL}/media/download-studio-zip/${eventId}`, {
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    onDownloadProgress: (evt) => {
      if (!onProgress) return
      const now = Date.now()
      if (!lastTime) { lastTime = now; lastLoaded = 0 }
      const elapsed = (now - lastTime) / 1000
      const deltaBytes = evt.loaded - lastLoaded
      const speedMBps = elapsed > 0 ? (deltaBytes / 1024 / 1024) / elapsed : 0
      lastLoaded = evt.loaded
      lastTime = now
      const percent = evt.total ? Math.round((evt.loaded / evt.total) * 100) : 0
      const remaining = evt.total ? (evt.total - evt.loaded) : 0
      const etaSec = speedMBps > 0 ? Math.round((remaining / 1024 / 1024) / speedMBps) : null
      onProgress({ percent, speedMBps, etaSec, loaded: evt.loaded, total: evt.total })
    }
  })
  triggerBlobDownload(res.data, filename || `studio-favourites.zip`)
}

export const uploadProfileImage = (formData) => api.post('/upload/profile', formData)
export const uploadCoverImage = (formData) => api.post('/upload/cover', formData)
export const uploadWatermark = (formData) => api.post('/upload/watermark', formData)
