import axios from 'axios'
import { API_BASE_URL } from '../utils/apiUrl'

const api = axios.create({
  baseURL: API_BASE_URL,
  // Do NOT set a default Content-Type — axios auto-sets it per request:
  // 'application/json' for objects, 'multipart/form-data; boundary=...' for FormData
})

api.interceptors.request.use(config => {
  // Lazy import to avoid circular deps
  const token = JSON.parse(sessionStorage.getItem('sv-auth') || localStorage.getItem('sv-auth') || '{}')?.state?.token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res.data,
  err => {
    // Preserve cancellation errors as-is (name/code intact) so callers can
    // tell "I aborted this on purpose" apart from a real failure — collapsing
    // it to a plain string here would make that distinction impossible.
    if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {
      return Promise.reject(err)
    }
    const isLoginRequest = err.config?.url?.includes('/auth/login')
    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('sv-auth')
      sessionStorage.removeItem('sv-auth')
      window.location.href = '/login'
    }
    return Promise.reject(err.response?.data?.message || 'Something went wrong.')
  }
)

export default api
