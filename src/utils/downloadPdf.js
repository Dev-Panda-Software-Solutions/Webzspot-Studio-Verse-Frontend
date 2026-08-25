import toast from 'react-hot-toast'
import { API_BASE_URL } from './apiUrl'

// PDF endpoints require the bearer token, so a plain <a href> can't be used —
// fetch as a blob (bypassing the shared axios instance's res.data-unwrapping
// interceptor) and open it in a new tab for viewing/printing/saving.
//
// The tab is opened synchronously, before the first await, so it still
// carries the click's user-gesture — opening it only after the blob finishes
// fetching would get silently popup-blocked in Safari (and Chrome under
// stricter settings), since by then the call is no longer within the
// gesture's call stack.
export const openBillingPdf = async (path) => {
  const tab = window.open('', '_blank')

  try {
    const { default: axios } = await import('axios')
    const token = JSON.parse(sessionStorage.getItem('sv-auth') || localStorage.getItem('sv-auth') || '{}')?.state?.token

    const res = await axios.get(`${API_BASE_URL}${path}`, {
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const url = window.URL.createObjectURL(res.data)
    if (tab) tab.location.href = url
    setTimeout(() => window.URL.revokeObjectURL(url), 60000)
  } catch (err) {
    tab?.close()
    toast.error('Failed to open PDF')
  }
}
