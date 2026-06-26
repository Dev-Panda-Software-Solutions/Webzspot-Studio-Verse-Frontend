import React, { useRef } from 'react'
import { gsap } from 'gsap'
import { Calendar, ArrowRight, Aperture } from 'lucide-react'
import { formatDate } from '../../utils/formatters'
import { useShutterNavigate } from '../../context/ShutterContext'
import { backendAssetUrl } from '../../utils/apiUrl'

/* ─── Rule-of-thirds corner bracket ─── */
function Bracket({ corner }) {
  const styles = {
    'tl': { top: 10, left: 10, borderTop: '1.5px solid', borderLeft: '1.5px solid' },
    'tr': { top: 10, right: 10, borderTop: '1.5px solid', borderRight: '1.5px solid' },
    'bl': { bottom: 10, left: 10, borderBottom: '1.5px solid', borderLeft: '1.5px solid' },
    'br': { bottom: 10, right: 10, borderBottom: '1.5px solid', borderRight: '1.5px solid' },
  }[corner]
  return (
    <div className="absolute w-4 h-4 transition-all duration-300 opacity-20 group-hover:opacity-70"
      style={{ ...styles, borderColor: '#F59E0B' }} />
  )
}

export default function EventCard({ event, eventId, isNew = false, onCreate }) {
  const shutterNavigate = useShutterNavigate()
  const cardRef = useRef(null)
  const ringRef = useRef(null)
  const iconRef = useRef(null)

  const resolvedId = eventId || event?.event_id

  /* ─── Create-new card ─── */
  if (isNew) {
    const handleNewEnter = () => {
      gsap.to(ringRef.current, { rotate: 60, duration: 0.55, ease: 'power2.out' })
      gsap.to(iconRef.current, { rotate: -20, scale: 1.18, duration: 0.4, ease: 'back.out(2)' })
      gsap.to(cardRef.current, { y: -4, duration: 0.3, ease: 'power2.out' })
    }
    const handleNewLeave = () => {
      gsap.to(ringRef.current, { rotate: 0, duration: 0.45, ease: 'power2.out' })
      gsap.to(iconRef.current, { rotate: 0, scale: 1, duration: 0.35, ease: 'power2.out' })
      gsap.to(cardRef.current, { y: 0, duration: 0.35, ease: 'power2.out' })
    }

    return (
      <div
        ref={cardRef}
        onClick={onCreate}
        className="event-card rounded-xl overflow-hidden cursor-pointer group min-h-[220px]"
        style={{ border: '1px dashed var(--border-default)', background: 'var(--bg-surface)', willChange: 'transform' }}
        onMouseEnter={handleNewEnter}
        onMouseLeave={handleNewLeave}
      >
        {/* Top zone — dark photographic field */}
        <div className="h-40 relative flex items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0c0c0e 0%, #13100a 60%, #0a0a0c 100%)' }}
        >
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              backgroundImage:
                'linear-gradient(rgba(245,158,11,0.045) 1px, transparent 1px),' +
                'linear-gradient(90deg, rgba(245,158,11,0.045) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />

          {/* Rule-of-thirds brackets */}
          {['tl', 'tr', 'bl', 'br'].map(c => <Bracket key={c} corner={c} />)}

          {/* Aperture ring + icon */}
          <div ref={ringRef} className="relative w-20 h-20 flex items-center justify-center"
            style={{ willChange: 'transform' }}>
            {/* Outer dashed ring */}
            <div className="absolute inset-0 rounded-full border border-dashed"
              style={{ borderColor: 'rgba(245,158,11,0.35)' }} />
            {/* Inner ring */}
            <div className="absolute inset-3 rounded-full border"
              style={{ borderColor: 'rgba(245,158,11,0.15)' }} />
            {/* Aperture icon */}
            <div ref={iconRef} style={{ willChange: 'transform' }}>
              <Aperture size={30} style={{ color: '#F59E0B', opacity: 0.9 }} />
            </div>
            {/* Plus badge */}
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center
              text-xs font-bold leading-none select-none"
              style={{ background: '#F59E0B', color: '#000' }}>
              +
            </div>
          </div>

          {/* Shimmer sweep */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.06), transparent)' }} />
        </div>

        {/* Bottom text */}
        <div className="p-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Create New Event
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Start a new photo session
          </p>
        </div>
      </div>
    )
  }

  /* ─── Regular event card ─── */
  const handleMouseEnter = () => gsap.to(cardRef.current, { y: -4, duration: 0.25, ease: 'power2.out' })
  const handleMouseLeave = () => gsap.to(cardRef.current, { y: 0, duration: 0.35, ease: 'power2.out' })

  return (
    <div
      ref={cardRef}
      className="event-card rounded-xl overflow-hidden cursor-pointer group"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        willChange: 'transform',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => resolvedId && shutterNavigate(`/studio/events/${resolvedId}`)}
    >
      {/* Cover */}
      <div className="h-40 relative overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        {event?.profile_url ? (
          <img src={backendAssetUrl(event.profile_url)} alt={event.event_name}
            className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-display italic text-xl px-4 text-center" style={{ color: 'var(--text-tertiary)' }}>
              {event?.event_name}
            </p>
          </div>
        )}
        {/* Gold shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(245,158,11,0.08)] to-transparent
          -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold truncate mb-0.5" style={{ color: 'var(--text-primary)' }}>
          {event?.event_name || 'Untitled Event'}
        </h3>
        {(event?.event_date || event?.event_venue) && (
          <p className="text-xs mb-3 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <Calendar size={10} className="opacity-60 flex-shrink-0" />
            {formatDate(event?.event_date)}{event?.event_venue ? ` · ${event.event_venue}` : ''}
          </p>
        )}

        <div className="flex items-center justify-between pt-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <span className="text-xs font-medium flex items-center gap-1 group-hover:gap-2 transition-all"
            style={{ color: '#F59E0B' }}>
            View Event <ArrowRight size={11} />
          </span>
          {event?.isactive === false && (
            <span className="text-xs" style={{ color: 'var(--error)' }}>Archived</span>
          )}
        </div>
      </div>
    </div>
  )
}
