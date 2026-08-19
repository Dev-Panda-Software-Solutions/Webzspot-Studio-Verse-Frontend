import React, { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Heart, Download } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import PhotoGrid from '../../components/gallery/PhotoGrid'
import { getMediaByEvent, downloadFavouritesZip } from '../../api/media'
import { getEventById } from '../../api/events'
import { getUserFavourites } from '../../api/favourites'
import { getTenantSettings } from '../../api/tenants'
import useBrandColours from '../../hooks/useBrandColours'
import useAuthStore from '../../stores/authStore'
import useGalleryStore from '../../stores/galleryStore'
import GoldButton from '../../components/ui/GoldButton'
import toast from 'react-hot-toast'

export default function GalleryFavourites() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setFavourites, getFavouritedMediaIds } = useGalleryStore()
  const containerRef = useRef(null)
  const [downloading, setDownloading] = useState(false)

  const { data: eventData } = useQuery({
    queryKey: ['gallery-event', eventId],
    queryFn: () => getEventById(eventId),
    enabled: !!eventId,
  })
  const allowDownload = eventData?.data?.allow_download !== false

  // tenant_mapping[0] is the OWNER entry — included in USER response specifically for settings fetch
  const tenantId = eventData?.data?.tenant_mapping?.[0]?.tenant_id || eventData?.data?.tenant_id
  const { data: settingsData } = useQuery({
    queryKey: ['gallery-settings', tenantId],
    queryFn: () => getTenantSettings(tenantId),
    enabled: !!tenantId,
  })
  useBrandColours(
    containerRef,
    settingsData?.data?.primary_color,
    settingsData?.data?.secondary_color,
  )

  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: ['gallery-media', eventId],
    queryFn: () => getMediaByEvent(eventId, { page: 1, limit: 100 }),
    // Pre-signed S3 URLs expire after ~30s — refetch ahead of that so images keep loading.
    refetchInterval: 25_000,
  })

  // Use a page-specific key so we always fetch fresh data regardless of what
  // the Gallery page cached under ['user-favs', eventId].
  useQuery({
    queryKey: ['user-favs-page', eventId, user?.user_id],
    queryFn: async () => {
      const res = await getUserFavourites(user?.user_id, eventId)
      setFavourites(res?.data || [])
      return res
    },
    enabled: !!user?.user_id && !!eventId,
    staleTime: 0,
  })

  const allMedia = mediaData?.data?.items || []
  const favIds = getFavouritedMediaIds()
  const favouriteMedia = allMedia.filter(m => favIds.has(m.media_id))

  const handleDownload = async () => {
    if (!eventId || !user?.user_id || favouriteMedia.length === 0) return
    setDownloading(true)
    try {
      const safeName = (eventData?.data?.event_name || 'event').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'event'
      await downloadFavouritesZip(eventId, user.user_id, `${safeName}_my_favourites.zip`)
      toast.success('Download started!')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Download failed — downloads may be disabled for this event')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <AppLayout
      title={`My Favourites${favIds.size > 0 ? ` (${favIds.size})` : ''}`}
      actions={allowDownload && favouriteMedia.length > 0 ? (
        <GoldButton size="sm" variant="outline" icon={<Download size={14} />} loading={downloading} onClick={handleDownload}>
          Download
        </GoldButton>
      ) : null}
    >
      <div ref={containerRef} className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
        <main className="px-4 py-8">
        {!mediaLoading && favouriteMedia.length === 0 ? (
          <div className="py-24 flex flex-col items-center text-center">
            <Heart size={48} className="text-[var(--text-tertiary)] mb-4 animate-float" />
            <h2 className="font-display text-2xl text-[var(--text-primary)] mb-2">No favourites yet</h2>
            <p className="text-[var(--text-secondary)] mb-6">Tap the heart on any photo to save your favourites</p>
            <GoldButton onClick={() => navigate(`/gallery/${eventId}`)} variant="outline">
              Browse Gallery
            </GoldButton>
          </div>
        ) : (
          <PhotoGrid
            mediaList={favouriteMedia}
            eventId={eventId}
            loading={mediaLoading}
            showFavourite
          />
        )}
        </main>
      </div>
    </AppLayout>
  )
}
