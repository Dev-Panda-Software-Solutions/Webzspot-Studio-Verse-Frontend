import { API_BASE_URL } from './apiUrl'

// PDF endpoints require the bearer token, so a plain <a href> can't be used —
// fetch as a blob (bypassing the shared axios instance's res.data-unwrapping
// interceptor) and open it in a new tab for viewing/printing/saving.
export const openBillingPdf = async (path) => {
  const { default: axios } = await import('axios')
  const token = JSON.parse(sessionStorage.getItem('sv-auth') || localStorage.getItem('sv-auth') || '{}')?.state?.token

  const res = await axios.get(`${API_BASE_URL}${path}`, {
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const url = window.URL.createObjectURL(res.data)
  window.open(url, '_blank')
  setTimeout(() => window.URL.revokeObjectURL(url), 60000)
}
