import { useState, useEffect } from 'react'
import { getMediaToken } from '../api/media'
import useGalleryStore from '../stores/galleryStore'

export default function useMediaToken(mediaId) {
  const { getToken, setToken } = useGalleryStore()
  const [token, setLocalToken] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!mediaId) return
    const cached = getToken(mediaId)
    if (cached) { setLocalToken(cached); return }

    setLoading(true)
    getMediaToken(mediaId)
      .then(res => {
        const t = res.data?.token
        if (t) { setToken(mediaId, t); setLocalToken(t) }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mediaId])

  return { token, loading }
}
