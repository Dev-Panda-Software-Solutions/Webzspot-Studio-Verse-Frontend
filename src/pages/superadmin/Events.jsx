import React, { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Building2, Trash2, Archive, ChevronDown, ChevronUp } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import GlassCard from '../../components/ui/GlassCard'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import Badge from '../../components/ui/Badge'
import GoldButton from '../../components/ui/GoldButton'
import { getEvents, deleteEvent, hardDeleteEvent } from '../../api/events'
import { formatDate } from '../../utils/formatters'
import toast from 'react-hot-toast'

function EventRow({ event, onSoftDelete, onHardDelete }) {
  return (
    <div
      className="flex items-center gap-4 px-5 py-4 border-b group transition-colors"
      style={{ borderColor: 'var(--border-subtle)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--accent-muted)' }}>
        <CalendarDays size={14} className="text-gold-500" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {event.event_name}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {event.event_date ? formatDate(event.event_date) : '—'}
          {event.event_venue ? ` · ${event.event_venue}` : ''}
        </p>
      </div>

      <Badge variant={event.isactive ? 'success' : 'error'}>
        {event.isactive ? 'Active' : 'Archived'}
      </Badge>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onSoftDelete(event.event_id, event.event_name)}
          title="Archive event (soft delete)"
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => e.currentTarget.style.color = '#FBBF24'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          <Archive size={14} />
        </button>
        <button
          onClick={() => onHardDelete(event.event_id, event.event_name)}
          title="Permanently delete event"
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function StudioGroup({ studio, events, onSoftDelete, onHardDelete }) {
  const [open, setOpen] = useState(true)
  return (
    <GlassCard hover={false} className="p-0 overflow-hidden mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors"
        style={{ borderBottom: open ? '1px solid var(--border-subtle)' : 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
          {(studio[0] || '?').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{studio}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </p>
        </div>
        {open ? <ChevronUp size={14} style={{ color: 'var(--text-tertiary)' }} />
               : <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />}
      </button>

      {open && events.map(ev => (
        <EventRow
          key={ev.event_id}
          event={ev}
          onSoftDelete={onSoftDelete}
          onHardDelete={onHardDelete}
        />
      ))}
    </GlassCard>
  )
}

export default function AdminEvents() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-events', page],
    queryFn: () => getEvents({ page, limit: 100 })
  })

  const items = data?.data?.items || []
  const total = data?.data?.total || 0
  const pages = data?.data?.pages || 1

  // Group events by studio name
  const groups = useMemo(() => {
    const map = new Map()
    for (const ev of items) {
      const studioName = ev.owner_studio?.tenant_studio_name || 'Unassigned'
      if (!map.has(studioName)) map.set(studioName, [])
      map.get(studioName).push(ev)
    }
    // Sort groups alphabetically
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [items])

  const handleSoftDelete = async (eventId, eventName) => {
    if (!window.confirm(`Archive "${eventName}"?`)) return
    try {
      await deleteEvent(eventId)
      toast.success('Event archived')
      qc.invalidateQueries(['admin-events'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed') }
  }

  const handleHardDelete = async (eventId, eventName) => {
    if (!window.confirm(`Permanently delete "${eventName}" and ALL its media? This cannot be undone.`)) return
    try {
      await hardDeleteEvent(eventId)
      toast.success('Event permanently deleted')
      qc.invalidateQueries(['admin-events'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed') }
  }

  return (
    <AppLayout
      title="All Events"
      subtitle={`${total} events across all studios`}
    >
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}</div>
      ) : groups.length === 0 ? (
        <div className="py-24 flex flex-col items-center gap-3 text-center">
          <CalendarDays size={40} style={{ color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No events yet</p>
        </div>
      ) : (
        <>
          {groups.map(([studio, events]) => (
            <StudioGroup
              key={studio}
              studio={studio}
              events={events}
              onSoftDelete={handleSoftDelete}
              onHardDelete={handleHardDelete}
            />
          ))}

          {pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Page {page} of {pages}</p>
              <div className="flex gap-2">
                <GoldButton size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</GoldButton>
                <GoldButton size="sm" variant="outline" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>→</GoldButton>
              </div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  )
}
