export const BACKEND_BASE_URL = 'https://srv1567353.hstgr.cloud/webzspot-studio-verse'
export const API_BASE_URL = `${BACKEND_BASE_URL}/api`

export const apiUrl = (path = '') => {
  const clean = String(path).replace(/^\/+/, '')
  return `${API_BASE_URL}/${clean}`
}

export const backendAssetUrl = (path) => {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const clean = String(path).replace(/^\/+/, '')
  return `${BACKEND_BASE_URL}/${clean}`
}

export const mediaViewUrl = (token) => apiUrl(`media/view/${token}`)
