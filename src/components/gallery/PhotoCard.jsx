import React, { useState } from 'react'
import { Expand, Play, FileVideo, Image, Archive, Trash2 } from 'lucide-react'
import { useInView } from 'react-intersection-observer'
import WatermarkOverlay from './WatermarkOverlay'
import FavouriteButton from './FavouriteButton'
import TenantFavouriteButton from './TenantFavouriteButton'
import useMediaToken from '../../hooks/useMediaToken'
import { mediaViewUrl } from '../../utils/apiUrl'

const isVideo = (media) => media?.media_type?.startsWith('video/')

// Strip file extension from display name
const stripExt = (name = '') => name.replace(/\.[^/.]+$/, '')

// Format a "X.XX KB" string to human-readable
const fmtSize = (sizeStr) => {
  if (!sizeStr) return null
  const kb = parseFloat(sizeStr)
  if (isNaN(kb)) return sizeStr
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${Math.round(kb)} KB`
}

function FavBtn({ mediaId, eventId, showFavourite, showTenantFav, size = 16 }) {
  if (showTenantFav) return <TenantFavouriteButton mediaId={mediaId} eventId={eventId} size={size} />
  if (showFavourite) return <FavouriteButton mediaId={mediaId} eventId={eventId} size={size} />
  return null
}

/* ─── Masonry / Grid card ─── */
function CardView({ media, eventId, watermarkSrc, onClick, showFavourite, showTenantFav, square, onDelete, onHardDelete }) {
  const [loaded, setLoaded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const { ref: inViewRef, inView } = useInView({ triggerOnce: true, rootMargin: '200px' })
  const video = isVideo(media)
  // Pre-signed S3 URL comes straight from the media list — fall back to the
  // legacy token flow only for media that predates the S3 migration.
  const { token } = useMediaToken(inView && !media.media_url ? media.media_id : null)
  const src = media.media_url || (token ? mediaViewUrl(token) : null)

  const hasFav = showFavourite || showTenantFav

  return (
    <div
      ref={inViewRef}
      className={`relative overflow-hidden rounded-xl photo-item cursor-pointer group ${square ? '' : 'mb-4'}`}
      style={{ background: 'var(--bg-elevated)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick && onClick(media)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div style={square ? { aspectRatio: '1 / 1', overflow: 'hidden', position: 'relative' } : { position: 'relative' }}>
        {!loaded && <div className="skeleton absolute inset-0" style={{ minHeight: square ? 'auto' : 192 }} />}

        {video ? (
          src && (
            <div className="relative w-full h-full" onContextMenu={(e) => e.preventDefault()}>
              <video
                src={src} muted autoPlay={inView} loop playsInline
                disablePictureInPicture disableRemotePlayback
                onCanPlay={() => setLoaded(true)}
                onContextMenu={(e) => e.preventDefault()}
                controlsList="nodownload nofullscreen"
                className={`w-full h-full transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                style={{ pointerEvents: 'none', userSelect: 'none', objectFit: 'cover', maxHeight: square ? 'none' : 240 }}
              />
              <div className="absolute inset-0" onContextMenu={(e) => e.preventDefault()} />
              {loaded && (
                <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5">
                  <Play size={12} className="text-white fill-white" />
                </div>
              )}
            </div>
          )
        ) : (
          src && (
            <div className="relative w-full h-full" onContextMenu={(e) => e.preventDefault()}>
              <img
                src={src} alt={media.media_name || 'Photo'} loading="lazy" decoding="async"
                draggable={false} onLoad={() => setLoaded(true)}
                onContextMenu={(e) => e.preventDefault()}
                className={`w-full h-full no-select transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                style={{ pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none', objectFit: 'cover' }}
              />
              <div className="absolute inset-0" onContextMenu={(e) => e.preventDefault()} />
            </div>
          )
        )}

        {loaded && <WatermarkOverlay src={watermarkSrc} />}
      </div>

      {/* Hover overlay — darkens, shows expand */}
      <div className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`} />

      {/* Expand button — hover only */}
      <div className={`absolute bottom-3 left-3 transition-all duration-200 ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
        <button
          onClick={(e) => { e.stopPropagation(); onClick && onClick(media) }}
          className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
        >
          <Expand size={14} className="text-white" />
        </button>
      </div>

      {/* Heart — always visible in bottom-right */}
      {loaded && hasFav && (
        <div className="absolute bottom-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
          <FavBtn mediaId={media.media_id} eventId={eventId}
            showFavourite={showFavourite} showTenantFav={showTenantFav} size={14} />
        </div>
      )}

      {/* Delete actions — top-right, hover only, only when handlers provided */}
      {(onDelete || onHardDelete) && loaded && (
        <div
          className={`absolute top-2 right-2 flex gap-1 z-10 transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {onDelete && (
            <button
              onClick={() => onDelete(media.media_id, media.media_name)}
              title="Archive photo"
              className="w-6 h-6 flex items-center justify-center rounded-lg"
              style={{ background: 'rgba(0,0,0,0.6)', color: '#FBBF24' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
            >
              <Archive size={11} />
            </button>
          )}
          {onHardDelete && (
            <button
              onClick={() => onHardDelete(media.media_id, media.media_name)}
              title="Permanently delete"
              className="w-6 h-6 flex items-center justify-center rounded-lg"
              style={{ background: 'rgba(0,0,0,0.6)', color: '#F87171' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      )}

      {/* Name on hover */}
      {loaded && media.media_name && (
        <div className={`absolute top-2 left-2 right-2 transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-white text-xs truncate bg-black/50 rounded px-2 py-0.5">
            {stripExt(media.media_name)}{fmtSize(media.media_size) ? ` · ${fmtSize(media.media_size)}` : ''}
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── List row ─── */
function ListView({ media, eventId, watermarkSrc, onClick, showFavourite, showTenantFav, onDelete, onHardDelete }) {
  const [loaded, setLoaded] = useState(false)
  const { ref: inViewRef, inView } = useInView({ triggerOnce: true, rootMargin: '200px' })
  const video = isVideo(media)
  const { token } = useMediaToken(inView && !media.media_url ? media.media_id : null)
  const src = media.media_url || (token ? mediaViewUrl(token) : null)

  return (
    <div
      ref={inViewRef}
      className="photo-item flex items-center gap-4 rounded-xl px-4 py-3 cursor-pointer group transition-colors duration-150"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      onClick={() => onClick && onClick(media)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 rounded-lg overflow-hidden"
        style={{ width: 72, height: 72, background: 'var(--bg-elevated)' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {!loaded && <div className="skeleton absolute inset-0" />}
        {video ? (
          src && (
            <video src={src} muted autoPlay={inView} loop playsInline
              disablePictureInPicture disableRemotePlayback
              onCanPlay={() => setLoaded(true)}
              onContextMenu={(e) => e.preventDefault()}
              controlsList="nodownload nofullscreen"
              className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ pointerEvents: 'none' }}
            />
          )
        ) : (
          src && (
            <img src={src} alt={media.media_name || ''} loading="lazy" draggable={false}
              onLoad={() => setLoaded(true)} onContextMenu={(e) => e.preventDefault()}
              className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            />
          )
        )}
        {video && loaded && (
          <div className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
            <Play size={9} className="text-white fill-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {stripExt(media.media_name) || 'Untitled'}
        </p>
        <p className="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text-tertiary)' }}>
          {video ? <FileVideo size={11} /> : <Image size={11} />}
          <span>{media.media_type?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
          {(media.original_size || media.media_size) && (
            <>
              <span style={{ color: 'var(--border-default)' }}>·</span>
              {media.original_size && media.original_size !== media.media_size && (
                <span title="Original size" style={{ color: 'var(--text-tertiary)' }}>
                  {fmtSize(media.original_size)}
                </span>
              )}
              {media.original_size && media.original_size !== media.media_size && (
                <span style={{ color: 'var(--border-default)' }}>→</span>
              )}
              <span title="Stored size" style={{ color: 'var(--accent-primary)' }}>
                {fmtSize(media.media_size)}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Actions — heart always visible, expand + delete on hover */}
      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <FavBtn mediaId={media.media_id} eventId={eventId}
          showFavourite={showFavourite} showTenantFav={showTenantFav} size={15} />
        <button
          onClick={(e) => { e.stopPropagation(); onClick && onClick(media) }}
          className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <Expand size={14} style={{ color: 'var(--text-secondary)' }} />
        </button>
        {onDelete && (
          <button
            onClick={() => onDelete(media.media_id, media.media_name)}
            title="Archive"
            className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            style={{ background: 'var(--bg-elevated)', color: '#FBBF24' }}
          >
            <Archive size={14} />
          </button>
        )}
        {onHardDelete && (
          <button
            onClick={() => onHardDelete(media.media_id, media.media_name)}
            title="Permanently delete"
            className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            style={{ background: 'var(--bg-elevated)', color: '#F87171' }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Exported component ─── */
export default function PhotoCard({ media, eventId, watermarkSrc, onClick, showFavourite = true, showTenantFav = false, view = 'masonry', onDelete, onHardDelete }) {
  if (view === 'list') {
    return <ListView media={media} eventId={eventId} watermarkSrc={watermarkSrc}
      onClick={onClick} showFavourite={showFavourite} showTenantFav={showTenantFav}
      onDelete={onDelete} onHardDelete={onHardDelete} />
  }
  return (
    <CardView media={media} eventId={eventId} watermarkSrc={watermarkSrc}
      onClick={onClick} showFavourite={showFavourite} showTenantFav={showTenantFav}
      square={view === 'grid'} onDelete={onDelete} onHardDelete={onHardDelete} />
  )
}
