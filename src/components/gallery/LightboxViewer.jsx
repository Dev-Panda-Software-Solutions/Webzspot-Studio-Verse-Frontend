import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import { motion } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Heart } from 'lucide-react'
import WatermarkOverlay from './WatermarkOverlay'
import FavouriteButton from './FavouriteButton'
import TenantFavouriteButton from './TenantFavouriteButton'
import useGalleryStore from '../../stores/galleryStore'
import useTenantFavouriteStore from '../../stores/tenantFavouriteStore'
import { addFavourite, removeFavourite, addTenantFavourite, removeTenantFavourite } from '../../api/favourites'
import useMediaToken from '../../hooks/useMediaToken'
import { getMediaToken } from '../../api/media'
import { mediaViewUrl } from '../../utils/apiUrl'
import toast from 'react-hot-toast'

/* ─── Confetti (same as FavouriteButton / TenantFavouriteButton) ─── */
const CONFETTI_COLORS = ['#F59E0B', '#FFFFFF', '#FB923C', '#FCD34D', '#F43F5E', '#34D399']
const CONFETTI = Array.from({ length: 28 }, (_, i) => {
  const angle = (i * Math.PI * 2) / 28 + (i % 2 === 0 ? 0.3 : -0.2)
  const distance = 90 + (i % 5) * 55
  const rect = i % 3 !== 0
  const w = rect ? 18 + (i % 3) * 6 : 10 + (i % 4) * 4
  const h = rect ? 9 + (i % 3) * 3 : 10 + (i % 4) * 4
  return { angle, distance, rect, w, h, color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }
})

function LbConfettiPiece({ angle, distance, rect, w, h, color }) {
  return (
    <motion.div className="absolute pointer-events-none z-30"
      style={{
        width: w, height: h,
        top: '50%', left: '50%',
        marginTop: -h / 2, marginLeft: -w / 2,
        background: color, borderRadius: rect ? 3 : '50%',
        boxShadow: `0 0 6px ${color}88`,
      }}
      initial={{ scale: 0, x: 0, y: 0, opacity: 1, rotate: 0 }}
      animate={{
        scale: [0, 1.6, 1.1, 0],
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        opacity: [1, 1, 0.9, 0],
        rotate: rect ? [0, 270] : 0,
      }}
      transition={{ duration: 0.85, ease: 'easeOut' }}
    />
  )
}

const isVideo = (media) => media?.media_type?.startsWith('video/')

/* ─── Centre heart burst on spacebar press ─── */
function HeartFlash({ adding }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center z-20"
      style={{ animation: 'lb-heart-pop 0.55s ease-out forwards' }}
    >
      <Heart
        size={120}
        style={{
          color: adding ? '#F59E0B' : 'rgba(255,255,255,0.65)',
          fill: adding ? '#F59E0B' : 'rgba(255,255,255,0.15)',
          filter: adding
            ? 'drop-shadow(0 0 24px #F59E0BAA) drop-shadow(0 0 48px #F59E0B44)'
            : 'drop-shadow(0 0 12px rgba(255,255,255,0.3))',
        }}
      />
      {adding && CONFETTI.map((c, i) => <LbConfettiPiece key={i} {...c} />)}
    </div>
  )
}

function LightboxImage({ media, watermarkSrc }) {
  const mediaId = media?.media_id
  // Prefer the direct pre-signed S3 url; fall back to the token-serve path (fetched
  // fresh, so it can't be stale) if that url has expired or otherwise fails to load —
  // a photo left open in the lightbox can easily outlive the ~30s presigned URL.
  const [useFallback, setUseFallback] = useState(false)
  const { token } = useMediaToken(useFallback || !media?.media_url ? mediaId : null)
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  useEffect(() => { setLoaded(false); setUseFallback(false); setErrored(false) }, [mediaId])

  const src = (!useFallback && media?.media_url) || (token ? mediaViewUrl(token) : null)

  const handleError = () => {
    if (!useFallback) { setUseFallback(true); return }
    setErrored(true)
  }

  return (
    <div className="relative flex items-center justify-center select-none">
      {!loaded && !errored && <div className="skeleton rounded-lg" style={{ width: 500, height: 380 }} />}
      {errored && (
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Couldn't load this photo. Try again in a moment.</p>
      )}
      {src && !errored && (
        <div className="relative" onContextMenu={(e) => e.preventDefault()}>
          <img
            src={src}
            alt={media?.media_name || 'Photo'}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onLoad={() => setLoaded(true)}
            onError={handleError}
            className={`max-h-[80vh] max-w-[85vw] object-contain rounded-lg
              transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
          />
          <div
            className="absolute inset-0 rounded-lg"
            onContextMenu={(e) => e.preventDefault()}
            style={{ zIndex: 1 }}
          />
          {loaded && <WatermarkOverlay src={watermarkSrc} size="lg" />}
        </div>
      )}
    </div>
  )
}

function LightboxVideo({ media, watermarkSrc }) {
  const mediaId = media?.media_id
  const [useFallback, setUseFallback] = useState(false)
  const { token } = useMediaToken(useFallback || !media?.media_url ? mediaId : null)
  const [errored, setErrored] = useState(false)

  useEffect(() => { setUseFallback(false); setErrored(false) }, [mediaId])

  const src = (!useFallback && media?.media_url) || (token ? mediaViewUrl(token) : null)

  const handleError = () => {
    if (!useFallback) { setUseFallback(true); return }
    setErrored(true)
  }

  return (
    <div
      className="relative flex items-center justify-center select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {errored ? (
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Couldn't load this video. Try again in a moment.</p>
      ) : src ? (
        <div className="relative" onContextMenu={(e) => e.preventDefault()}>
          <video
            key={src}
            src={src}
            className="max-h-[80vh] max-w-[85vw] rounded-lg outline-none"
            controls
            autoPlay
            controlsList="nodownload nofullscreen"
            disablePictureInPicture
            disableRemotePlayback
            onContextMenu={(e) => e.preventDefault()}
            onError={handleError}
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          />
          <div className="absolute inset-0 pointer-events-none select-none"
            style={{ zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 44 }}>
            <WatermarkOverlay src={watermarkSrc} size="lg" />
          </div>
        </div>
      ) : (
        <div className="skeleton rounded-lg" style={{ width: 500, height: 380 }} />
      )}
    </div>
  )
}

export default function LightboxViewer({
  media, index, total,
  mediaList = [],
  onClose, onPrev, onNext,
  watermarkSrc, eventId,
  showFavourite = false,
  showTenantFav = false,
  isStudioPick = false,
  atFavouriteLimit = false,
  frozen = false,
  ownerLabels = null,   // string[] — who favourited this photo (from FavouritesGallery)
}) {
  const hideSize = showFavourite && !showTenantFav
  const panelRef = useRef(null)
  const [heartFlash, setHeartFlash] = useState(null) // null | { adding: bool, key: number }
  const flashHeart = (adding) => {
    setHeartFlash({ adding, key: Date.now() })
    setTimeout(() => setHeartFlash(null), 560)
  }

  // Silently prefetch legacy tokens for the 5 photos before/after current index —
  // only needed for pre-S3-migration media that has no media_url already.
  useEffect(() => {
    if (!mediaList.length) return
    const { getToken, setToken } = useGalleryStore.getState()
    const start = Math.max(0, index - 5)
    const end = Math.min(mediaList.length - 1, index + 5)
    for (let i = start; i <= end; i++) {
      const m = mediaList[i]
      if (!m || i === index || m.media_url) continue
      const id = m.media_id
      if (getToken(id)) continue
      getMediaToken(id)
        .then(res => { const t = res?.data?.token || res?.token; if (t) setToken(id, t) })
        .catch(() => {})
    }
  }, [index, mediaList])

  useLayoutEffect(() => {
    if (!media) return
    const ctx = gsap.context(() => {
      gsap.from('.lb-content', { y: -20, opacity: 0, duration: 0.4, ease: 'power3.out' })
      gsap.from(panelRef.current, { y: 30, opacity: 0, duration: 0.4, delay: 0.2, ease: 'power3.out' })
    })
    return () => ctx.revert()
  }, [media?.media_id])

  useEffect(() => {
    const handler = async (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowLeft') { onPrev?.(); return }
      if (e.key === 'ArrowRight') { onNext?.(); return }

      // Spacebar → toggle favourite (images only, not video)
      if (e.key === ' ') {
        e.preventDefault()
        if (!media || isVideo(media)) return
        if (!showFavourite && !showTenantFav) return

        // Shared lock with the heart button's own click handler (same store) so a
        // click and a space-press on the same photo serialize instead of racing.
        const store = showTenantFav ? useTenantFavouriteStore.getState() : useGalleryStore.getState()
        if (store.isPending(media.media_id)) return
        store.setPending(media.media_id, true)

        try {
          if (showTenantFav) {
            const ts = store
            const fav = ts.isFavourited(media.media_id)
            if (fav) {
              const favId = ts.getFavId(media.media_id)
              ts.remove(media.media_id)
              flashHeart(false)
              try {
                await removeTenantFavourite(favId)
              } catch {
                ts.add(media.media_id, favId)
                toast.error('Could not remove favourite')
              }
            } else {
              const tempId = `temp-${media.media_id}-${Date.now()}`
              ts.add(media.media_id, tempId)
              flashHeart(true)
              try {
                const res = await addTenantFavourite({ event_id: eventId, media_id: media.media_id })
                const realId = res?.data?.tenant_favourite_id
                if (realId) ts.add(media.media_id, realId)
              } catch {
                ts.remove(media.media_id)
                toast.error('Could not add favourite')
              }
            }
          } else if (showFavourite) {
            if (frozen) {
              toast.error('Your favourites have been submitted and are locked')
              store.setPending(media.media_id, false)
              return
            }
            const gs = store
            const fav = gs.isFavourited(media.media_id)
            if (fav) {
              // Use the stored favourite record ID — NOT media_id (backend lookup by PK)
              const favId = gs.getFavId(media.media_id)
              gs.removeFavourite(media.media_id)
              flashHeart(false)
              try {
                await removeFavourite(favId)
              } catch (err) {
                gs.addFavourite(media.media_id, favId)
                toast.error(typeof err === 'string' ? err : 'Could not remove favourite')
              }
            } else if (atFavouriteLimit) {
              toast.error('Favourite limit reached for this event')
            } else {
              const tempId = `temp-${media.media_id}-${Date.now()}`
              gs.addFavourite(media.media_id, tempId)
              flashHeart(true)
              try {
                const res = await addFavourite({ event_id: eventId, media_id: media.media_id })
                const realId = res?.data?.user_favourite_media_id
                if (realId) gs.addFavourite(media.media_id, realId)
              } catch (err) {
                gs.removeFavourite(media.media_id)
                toast.error(typeof err === 'string' ? err : 'Could not add favourite')
              }
            }
          }
        } finally {
          store.setPending(media.media_id, false)
        }
      }
    }

    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose, onPrev, onNext, media, showFavourite, showTenantFav, eventId, atFavouriteLimit, frozen])

  if (!media) return null

  const mediaId = media.media_id
  const canFav = showFavourite || showTenantFav

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.96)' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Close */}
      <button onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20
          text-white transition-colors z-10">
        <X size={20} />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        {index + 1} / {total}
      </div>

      {/* Prev */}
      {onPrev && (
        <button onClick={onPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full
            bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
          <ChevronLeft size={24} />
        </button>
      )}
      {/* Next */}
      {onNext && (
        <button onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full
            bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
          <ChevronRight size={24} />
        </button>
      )}

      {/* Media + heart flash overlay */}
      <div className="lb-content relative">
        {isVideo(media)
          ? <LightboxVideo media={media} watermarkSrc={watermarkSrc} />
          : <LightboxImage media={media} watermarkSrc={watermarkSrc} />
        }
        {heartFlash && <HeartFlash key={heartFlash.key} adding={heartFlash.adding} />}
      </div>

      {/* Bottom panel — pointer-events-none so video seek bar stays clickable */}
      <div ref={panelRef}
        className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.4), transparent)' }}>
        <div className="pointer-events-auto">
          <div className="flex items-center gap-2">
            <p className="text-white font-medium">
              {media.media_name ? media.media_name.replace(/\.[^/.]+$/, '') : 'Untitled'}
            </p>
            {isStudioPick && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: 'rgba(245,158,11,0.9)', color: '#111113' }}>
                <Heart size={9} className="fill-current" /> Studio Pick
              </span>
            )}
          </div>
          <p className="text-xs flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span>{media.media_type}</span>
            {!hideSize && media.original_size && (
              <>
                <span>·</span>
                {media.original_size !== media.media_size && (
                  <span title="Original">{(() => {
                    const kb = parseFloat(media.original_size)
                    return isNaN(kb) ? media.original_size : kb >= 1024 ? `${(kb/1024).toFixed(1)} MB` : `${Math.round(kb)} KB`
                  })()} original</span>
                )}
                {media.original_size !== media.media_size && <span>→</span>}
                <span title="Stored/compressed">{(() => {
                  const kb = parseFloat(media.media_size)
                  return isNaN(kb) ? media.media_size : kb >= 1024 ? `${(kb/1024).toFixed(1)} MB` : `${Math.round(kb)} KB`
                })()} stored</span>
              </>
            )}
            {!hideSize && !media.original_size && media.media_size && (
              <><span>·</span><span>{(() => {
                const kb = parseFloat(media.media_size)
                return isNaN(kb) ? media.media_size : kb >= 1024 ? `${(kb/1024).toFixed(1)} MB` : `${Math.round(kb)} KB`
              })()}</span></>
            )}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {/* Owner labels — who favourited this photo */}
          {ownerLabels && ownerLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-end">
              {ownerLabels.map(label => (
                <span key={label}
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(245,158,11,0.25)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.4)' }}>
                  ♥ {label}
                </span>
              ))}
            </div>
          )}

          {canFav && (
            <div className="flex items-center gap-3 relative">
              <div className="flex flex-col items-center gap-1">
                <div className="relative p-2.5 rounded-2xl transition-colors"
                  style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
                  {showTenantFav
                    ? <TenantFavouriteButton mediaId={mediaId} eventId={eventId} size={28} />
                    : <FavouriteButton mediaId={mediaId} eventId={eventId} size={28} atLimit={atFavouriteLimit} frozen={frozen} />
                  }
                </div>
                <span className="text-[10px] font-medium select-none tracking-widest uppercase"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>
                  space
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>,
    document.body
  )
}
