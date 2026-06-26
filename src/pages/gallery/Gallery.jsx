import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { useQuery } from '@tanstack/react-query'
import { Heart, Camera, Clock, AlertTriangle } from 'lucide-react'
import PhotoGrid from '../../components/gallery/PhotoGrid'
import FavouritesDrawer from '../../components/gallery/FavouritesDrawer'
import ThemeToggle from '../../components/ui/ThemeToggle'
import GoldButton from '../../components/ui/GoldButton'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import { getEvents, getEventById } from '../../api/events'
import { getMediaByEvent } from '../../api/media'
import { getUserFavourites } from '../../api/favourites'
import { getTenantSettings } from '../../api/tenants'
import useAuthStore from '../../stores/authStore'
import useGalleryStore from '../../stores/galleryStore'
import { logout } from '../../api/auth'
import { backendAssetUrl } from '../../utils/apiUrl'
import toast from 'react-hot-toast'

export default function Gallery() {
  const { eventId: paramEventId } = useParams()
  const navigate = useNavigate()
  const { user, token, logout: storeLogout } = useAuthStore()
  const { setFavourites, getFavouritedMediaIds } = useGalleryStore()
  const containerRef = useRef(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mediaPage] = useState(1)

  // Always load user's events list: used for redirect on first load + access expiry info
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['user-events'],
    queryFn: () => getEvents({ page: 1, limit: 50 }),
  })

  useEffect(() => {
    if (!paramEventId && eventsData) {
      const firstEvent = eventsData?.data?.items?.[0]
      const eventObj = firstEvent?.event || firstEvent
      const eid = firstEvent?.event_id || eventObj?.event_id
      if (eid) navigate(`/gallery/${eid}`, { replace: true })
    }
  }, [paramEventId, eventsData])

  const activeEventId = paramEventId

  const { data: eventData } = useQuery({
    queryKey: ['gallery-event', activeEventId],
    queryFn: () => getEventById(activeEventId),
    enabled: !!activeEventId
  })

  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: ['gallery-media', activeEventId, mediaPage],
    queryFn: () => getMediaByEvent(activeEventId, { page: mediaPage, limit: 50 }),
    enabled: !!activeEventId
  })

  const event = eventData?.data
  const mediaList = mediaData?.data?.items || []

  // Find access info for active event from the user's events list
  const allUserEvents = eventsData?.data?.items || []
  const activeEventAccess = allUserEvents.find(e => e.event_id === activeEventId)?._access || null

  // Determine expiry state
  const accessExpiresDate = activeEventAccess?.access_expires ? new Date(activeEventAccess.access_expires) : null
  const now = new Date()
  const daysUntilExpiry = accessExpiresDate ? Math.ceil((accessExpiresDate - now) / 86400000) : null
  const accessExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0
  const accessExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 7

  // Load tenant settings for watermark
  const tenantId = event?.tenant_id
  const { data: settingsData } = useQuery({
    queryKey: ['gallery-settings', tenantId],
    queryFn: () => getTenantSettings(tenantId),
    enabled: !!tenantId
  })
  const watermarkPath = settingsData?.data?.tenant_watermark_path
  const watermarkSrc = watermarkPath ? backendAssetUrl(watermarkPath) : null

  // Load user favourites for this event
  useQuery({
    queryKey: ['user-favs', activeEventId],
    queryFn: async () => {
      // user_id is the actual User record ID (not the Login transid stored as user.id)
      const res = await getUserFavourites(user?.user_id, activeEventId)
      setFavourites(res?.data || [])
      return res
    },
    enabled: !!activeEventId && !!user?.user_id
  })

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.gallery-header', { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' })
    }, containerRef)
    return () => ctx.revert()
  }, [activeEventId])

  // Disable right-click on gallery
  useEffect(() => {
    const handler = (e) => e.preventDefault()
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [])

  const handleLogout = async () => {
    try { await logout() } catch {}
    storeLogout()
    navigate('/login')
    toast.success('Logged out')
  }

  if (eventsLoading || (!paramEventId && !eventsData)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <SkeletonLoader type="page" />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="min-h-screen grain" style={{ background: 'var(--bg-base)' }}>
      {/* Gallery Header */}
      <header className="gallery-header sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(10,10,11,0.92)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          {watermarkSrc ? (
            <img src={watermarkSrc} alt="Studio" className="h-7 object-contain opacity-80" />
          ) : (
            <div className="flex items-center gap-2">
              <Camera size={16} className="text-gold-500" />
              <span className="font-display text-sm text-gold-500">Studio-Verse</span>
            </div>
          )}
        </div>

        <h1 className="font-display italic text-xl text-gold-500 absolute left-1/2 -translate-x-1/2">
          {event?.event_name || 'Gallery'}
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="relative p-2 rounded-full hover:bg-[var(--accent-muted)] transition-colors"
          >
            <Heart size={18} className="text-[var(--text-secondary)]" />
            {getFavouritedMediaIds().size > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold-500 text-obsidian-base text-xs
                rounded-full flex items-center justify-center font-bold">
                {getFavouritedMediaIds().size}
              </span>
            )}
          </button>
          <ThemeToggle />
          <GoldButton size="sm" variant="ghost" onClick={handleLogout}>Sign Out</GoldButton>
        </div>
      </header>

      {/* Access expiry notice */}
      {(accessExpired || accessExpiringSoon) && (
        <div className="px-6 py-2.5 flex items-center gap-3"
          style={{
            background: accessExpired ? 'rgba(248,113,113,0.12)' : 'rgba(251,191,36,0.10)',
            borderBottom: `1px solid ${accessExpired ? 'rgba(248,113,113,0.25)' : 'rgba(251,191,36,0.25)'}`,
          }}>
          {accessExpired ? <AlertTriangle size={14} style={{ color: '#F87171', flexShrink: 0 }} /> : <Clock size={14} style={{ color: '#FBBF24', flexShrink: 0 }} />}
          <p className="text-xs" style={{ color: accessExpired ? '#F87171' : '#FBBF24' }}>
            {accessExpired
              ? 'Your access to this event has expired. Contact your studio to restore access.'
              : `Your access expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'} — ${accessExpiresDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            }
          </p>
        </div>
      )}

      {/* Gallery */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!activeEventId ? (
          <div className="py-24 text-center">
            <Camera size={48} className="mx-auto mb-4 text-[var(--text-tertiary)] animate-float" />
            <h2 className="font-display text-2xl text-[var(--text-primary)] mb-2">No events assigned</h2>
            <p className="text-[var(--text-secondary)]">Your studio hasn't added any events yet. Please contact them.</p>
          </div>
        ) : (
          <PhotoGrid
            mediaList={mediaList}
            eventId={activeEventId}
            watermarkSrc={watermarkSrc}
            loading={mediaLoading}
            showFavourite
          />
        )}
      </main>

      {/* Favourites drawer trigger + drawer */}
      <FavouritesDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(v => !v)}
        mediaList={mediaList}
        eventId={activeEventId}
      />
    </div>
  )
}
