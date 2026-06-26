import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { useQuery } from '@tanstack/react-query'
import { Heart, Camera, Clock, Lock, ChevronDown, ChevronUp } from 'lucide-react'
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
  const { user, logout: storeLogout } = useAuthStore()
  const { setFavourites, getFavouritedMediaIds } = useGalleryStore()
  const containerRef = useRef(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [mediaPage] = useState(1)

  // All events the user is assigned to (active + expired)
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['user-events'],
    queryFn: () => getEvents({ page: 1, limit: 100 }),
  })

  const allUserEvents = eventsData?.data?.items || []
  const accessibleEvents = allUserEvents.filter(e => e._access?.has_current_access !== false)

  // Auto-navigate to first accessible event if no URL param
  useEffect(() => {
    if (!paramEventId && eventsData) {
      const first = accessibleEvents[0]
      if (first?.event_id) navigate(`/gallery/${first.event_id}`, { replace: true })
    }
  }, [paramEventId, eventsData])

  const activeEventId = paramEventId

  // Access info for current event
  const currentAccess = allUserEvents.find(e => e.event_id === activeEventId)?._access
  const isLocked = currentAccess ? currentAccess.has_current_access === false : false

  // Expiry warning (for events that will expire soon but aren't expired yet)
  const expiresDate = currentAccess?.access_expires ? new Date(currentAccess.access_expires) : null
  const now = new Date()
  const daysLeft = expiresDate ? Math.ceil((expiresDate - now) / 86400000) : null
  const expiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 7

  // Don't load event/media/favs if locked
  const { data: eventData } = useQuery({
    queryKey: ['gallery-event', activeEventId],
    queryFn: () => getEventById(activeEventId),
    enabled: !!activeEventId && !isLocked,
  })

  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: ['gallery-media', activeEventId, mediaPage],
    queryFn: () => getMediaByEvent(activeEventId, { page: mediaPage, limit: 50 }),
    enabled: !!activeEventId && !isLocked,
  })

  const event = eventData?.data
  const eventName = event?.event_name
    || allUserEvents.find(e => e.event_id === activeEventId)?.event_name
    || 'Gallery'
  const mediaList = mediaData?.data?.items || []

  const tenantId = event?.tenant_id
  const { data: settingsData } = useQuery({
    queryKey: ['gallery-settings', tenantId],
    queryFn: () => getTenantSettings(tenantId),
    enabled: !!tenantId,
  })
  const watermarkSrc = settingsData?.data?.tenant_watermark_path
    ? backendAssetUrl(settingsData.data.tenant_watermark_path)
    : null

  useQuery({
    queryKey: ['user-favs', activeEventId],
    queryFn: async () => {
      const res = await getUserFavourites(user?.user_id, activeEventId)
      setFavourites(res?.data || [])
      return res
    },
    enabled: !!activeEventId && !!user?.user_id && !isLocked,
  })

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.gallery-header', { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' })
    }, containerRef)
    return () => ctx.revert()
  }, [activeEventId])

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

  const handleSwitchEvent = (ev) => {
    if (ev._access?.has_current_access === false) return
    navigate(`/gallery/${ev.event_id}`)
    setSwitcherOpen(false)
  }

  if (eventsLoading || (!paramEventId && !eventsData)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <SkeletonLoader type="page" />
      </div>
    )
  }

  const hasMultiple = allUserEvents.length > 1

  return (
    <div ref={containerRef} className="min-h-screen grain" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header className="gallery-header sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(10,10,11,0.92)', borderBottom: '1px solid var(--border-subtle)' }}>

        {/* Left: studio logo / brand */}
        <div className="flex items-center gap-3 min-w-0">
          {watermarkSrc ? (
            <img src={watermarkSrc} alt="Studio" className="h-7 object-contain opacity-80" />
          ) : (
            <div className="flex items-center gap-2">
              <Camera size={16} className="text-gold-500" />
              <span className="font-display text-sm text-gold-500">Studio Verse</span>
            </div>
          )}
        </div>

        {/* Center: event name — dropdown trigger if multiple events */}
        {hasMultiple ? (
          <button
            onClick={() => setSwitcherOpen(v => !v)}
            className="font-display italic text-xl text-gold-500 absolute left-1/2 -translate-x-1/2
              flex items-center gap-1.5 hover:text-gold-400 transition-colors whitespace-nowrap"
          >
            {eventName}
            {switcherOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        ) : (
          <h1 className="font-display italic text-xl text-gold-500 absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
            {eventName}
          </h1>
        )}

        {/* Right: favourites + theme + logout */}
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

      {/* Event switcher panel */}
      {switcherOpen && hasMultiple && (
        <div className="sticky top-[65px] z-20 px-4 py-3"
          style={{ background: 'rgba(10,10,11,0.97)', borderBottom: '1px solid var(--border-subtle)' }}>
          <p className="text-xs text-[var(--text-tertiary)] mb-2 px-1 uppercase tracking-widest">Your Events</p>
          <div className="flex flex-wrap gap-2">
            {allUserEvents.map(ev => {
              const isCurrent = ev.event_id === activeEventId
              const locked = ev._access?.has_current_access === false
              return (
                <button
                  key={ev.event_id}
                  onClick={() => handleSwitchEvent(ev)}
                  disabled={locked}
                  title={locked ? 'Access expired — contact your studio' : undefined}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                    isCurrent
                      ? 'border-gold-500 text-gold-500 bg-[rgba(212,175,55,0.12)]'
                      : locked
                        ? 'border-[var(--border-subtle)] text-[var(--text-tertiary)] opacity-50 cursor-not-allowed'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-gold-500/50 hover:text-gold-500 cursor-pointer',
                  ].join(' ')}
                >
                  {locked && <Lock size={11} />}
                  {ev.event_name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Expiry warning (soon but not yet expired) */}
      {expiringSoon && !isLocked && (
        <div className="px-6 py-2.5 flex items-center gap-3"
          style={{ background: 'rgba(251,191,36,0.10)', borderBottom: '1px solid rgba(251,191,36,0.25)' }}>
          <Clock size={14} style={{ color: '#FBBF24', flexShrink: 0 }} />
          <p className="text-xs" style={{ color: '#FBBF24' }}>
            Access expires in {daysLeft} day{daysLeft === 1 ? '' : 's'} —{' '}
            {expiresDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      )}

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* No events assigned at all */}
        {allUserEvents.length === 0 && (
          <div className="py-24 text-center">
            <Camera size={48} className="mx-auto mb-4 text-[var(--text-tertiary)] animate-float" />
            <h2 className="font-display text-2xl text-[var(--text-primary)] mb-2">No events assigned</h2>
            <p className="text-[var(--text-secondary)]">Your studio hasn't added you to any events yet.</p>
          </div>
        )}

        {/* Access expired for this event */}
        {activeEventId && isLocked && (
          <div className="py-24 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.20)' }}>
              <Lock size={34} style={{ color: '#F87171' }} />
            </div>
            <h2 className="font-display text-2xl text-[var(--text-primary)] mb-2">Access Expired</h2>
            <p className="text-[var(--text-secondary)] max-w-sm mb-6">
              Your access to this event has expired. Contact your studio to renew it.
            </p>
            {accessibleEvents.length > 0 && (
              <GoldButton onClick={() => navigate(`/gallery/${accessibleEvents[0].event_id}`)}>
                View {accessibleEvents[0].event_name}
              </GoldButton>
            )}
          </div>
        )}

        {/* Active gallery */}
        {activeEventId && !isLocked && (
          <PhotoGrid
            mediaList={mediaList}
            eventId={activeEventId}
            watermarkSrc={watermarkSrc}
            loading={mediaLoading}
            showFavourite
          />
        )}

      </main>

      <FavouritesDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(v => !v)}
        mediaList={mediaList}
        eventId={activeEventId}
      />
    </div>
  )
}
