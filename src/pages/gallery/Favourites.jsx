import React, { useLayoutEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Heart } from 'lucide-react'
import PhotoGrid from '../../components/gallery/PhotoGrid'
import { getMediaByEvent } from '../../api/media'
import { getUserFavourites } from '../../api/favourites'
import useAuthStore from '../../stores/authStore'
import useGalleryStore from '../../stores/galleryStore'
import GoldButton from '../../components/ui/GoldButton'

export default function GalleryFavourites() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setFavourites, getFavouritedMediaIds } = useGalleryStore()
  const containerRef = useRef(null)

  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: ['gallery-media', eventId],
    queryFn: () => getMediaByEvent(eventId, { page: 1, limit: 100 })
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

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.fav-header', { y: -15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  const allMedia = mediaData?.data?.items || []
  const favIds = getFavouritedMediaIds()
  const favouriteMedia = allMedia.filter(m => favIds.has(m.media_id))

  return (
    <div ref={containerRef} className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header className="fav-header sticky top-0 z-30 px-6 py-4 flex items-center gap-4"
        style={{ background: 'rgba(10,10,11,0.92)', borderBottom: '1px solid var(--border-subtle)' }}>
        <button onClick={() => navigate(`/gallery/${eventId}`)}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-gold-500 transition-colors">
          <ArrowLeft size={14} /> Back to Gallery
        </button>
        <h1 className="font-display italic text-gold-500">
          My Favourites {favIds.size > 0 && `(${favIds.size})`}
        </h1>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
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
  )
}
