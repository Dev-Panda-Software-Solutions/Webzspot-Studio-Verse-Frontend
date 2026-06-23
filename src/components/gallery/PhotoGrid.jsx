import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { Heart } from 'lucide-react'
import PhotoCard from './PhotoCard'
import LightboxViewer from './LightboxViewer'
import SkeletonLoader from '../ui/SkeletonLoader'
import GalleryControls from './GalleryControls'
import { getTenantFavouritesForEvent } from '../../api/favourites'
import useTenantFavouriteStore from '../../stores/tenantFavouriteStore'

// Slider right = zoom in = fewer cols = bigger items
// zoom 0 (left/out) → most cols (smallest), zoom 9 (right/in) → fewest cols (biggest)
const MASONRY_COLS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
const GRID_COLS    = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]

export default function PhotoGrid({
  mediaList = [],
  eventId,
  watermarkSrc,
  loading,
  showFavourite = true,
  showTenantFav = false,
}) {
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [view, setView] = useState('masonry')
  const [zoom, setZoom] = useState(6) // index 6 → 4 cols default
  const [filterFavs, setFilterFavs] = useState(false)
  const gridRef = useRef(null)

  const { setFavourites, getFavouritedIds } = useTenantFavouriteStore()

  // Load tenant favourites when showTenantFav is enabled
  useEffect(() => {
    if (!showTenantFav || !eventId) return
    getTenantFavouritesForEvent(eventId)
      .then(res => setFavourites(res?.data || []))  // res is already JSON body {success,data,message}
      .catch(() => {})
  }, [showTenantFav, eventId])

  useLayoutEffect(() => {
    if (!mediaList.length) return
    const ctx = gsap.context(() => {
      gsap.from('.photo-item', {
        opacity: 0, y: 20, scale: 0.96,
        stagger: { amount: 0.35, from: 'start' },
        duration: 0.4, ease: 'power3.out'
      })
    }, gridRef)
    return () => ctx.revert()
  }, [mediaList.length, view, zoom, filterFavs])

  if (loading) return <SkeletonLoader type="photo-grid" count={9} />

  if (!mediaList.length) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-float"
        style={{ background: 'var(--accent-muted)' }}>
        <span className="text-3xl">📷</span>
      </div>
      <h3 className="font-display text-xl mb-2" style={{ color: 'var(--text-primary)' }}>No photos yet</h3>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Photos uploaded to this event will appear here
      </p>
    </div>
  )

  const favIds = getFavouritedIds()
  const displayList = filterFavs
    ? mediaList.filter(m => favIds.has(m.media_id))
    : mediaList

  const current = lightboxIndex !== null ? displayList[lightboxIndex] : null
  const mCols = MASONRY_COLS[zoom]
  const gCols = GRID_COLS[zoom]

  const cardProps = (media) => ({
    media,
    eventId,
    watermarkSrc,
    showFavourite,
    showTenantFav,
    onClick: (m) => setLightboxIndex(displayList.findIndex(x => x.media_id === m.media_id)),
  })

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <GalleryControls
          view={view} onView={v => { setView(v); setFilterFavs(false) }}
          zoom={zoom} onZoom={setZoom}
          count={view === 'grid' ? gCols : mCols}
        />

        {/* Tenant favourite filter — only visible when showTenantFav is on */}
        {showTenantFav && (
          <button
            onClick={() => setFilterFavs(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ml-auto ${
              filterFavs
                ? 'text-[var(--bg-base)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            style={{
              background: filterFavs ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Heart size={12} className={filterFavs ? 'fill-current' : ''} />
            {filterFavs ? 'Showing Favourites' : 'My Favourites'}
          </button>
        )}
      </div>

      {filterFavs && displayList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Heart size={36} className="mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            No studio favourites yet — click the heart on any photo to save it here.
          </p>
        </div>
      )}

      {/* ── Masonry ── */}
      {view === 'masonry' && displayList.length > 0 && (
        <div ref={gridRef} style={{ columns: mCols, columnGap: 16 }}>
          {displayList.map((media) => (
            <PhotoCard key={media.media_id} {...cardProps(media)} view="masonry" />
          ))}
        </div>
      )}

      {/* ── Grid ── */}
      {view === 'grid' && displayList.length > 0 && (
        <div ref={gridRef}
          style={{ display: 'grid', gridTemplateColumns: `repeat(${gCols}, 1fr)`, gap: 12 }}>
          {displayList.map((media) => (
            <PhotoCard key={media.media_id} {...cardProps(media)} view="grid" />
          ))}
        </div>
      )}

      {/* ── List ── */}
      {view === 'list' && displayList.length > 0 && (
        <div ref={gridRef} className="flex flex-col gap-2">
          {displayList.map((media) => (
            <PhotoCard key={media.media_id} {...cardProps(media)} view="list" />
          ))}
        </div>
      )}

      {current && (
        <LightboxViewer
          media={current}
          index={lightboxIndex}
          total={displayList.length}
          eventId={eventId}
          watermarkSrc={watermarkSrc}
          showFavourite={showFavourite}
          showTenantFav={showTenantFav}
          onClose={() => setLightboxIndex(null)}
          onPrev={lightboxIndex > 0 ? () => setLightboxIndex(i => i - 1) : null}
          onNext={lightboxIndex < displayList.length - 1 ? () => setLightboxIndex(i => i + 1) : null}
        />
      )}
    </>
  )
}
