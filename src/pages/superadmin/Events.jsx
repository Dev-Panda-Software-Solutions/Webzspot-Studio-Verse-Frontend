import React, { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Trash2, Archive, ChevronRight, Pencil, Users, History } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import GlassCard from '../../components/ui/GlassCard'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import Badge from '../../components/ui/Badge'
import GoldButton from '../../components/ui/GoldButton'
import Modal from '../../components/ui/Modal'
import CreateEventModal from '../../components/events/CreateEventModal'
import { getEvents, deleteEvent, hardDeleteEvent } from '../../api/events'
import { getTenantSummary } from '../../api/tenants'
import { getTenantSubscriptionHistory } from '../../api/billing'
import { formatDate, planLabel, planStatusVariant } from '../../utils/formatters'
import toast from 'react-hot-toast'

function EventRow({ event, onEdit, onSoftDelete, onHardDelete }) {
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
          onClick={() => onEdit(event)}
          title="Edit event"
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => e.currentTarget.style.color = '#93C5FD'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onSoftDelete(event.event_id, event.event_name)}
          title="Archive event"
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => e.currentTarget.style.color = '#FBBF24'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
        >
          <Archive size={14} />
        </button>
        <button
          onClick={() => onHardDelete(event.event_id, event.event_name)}
          title="Permanently delete"
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

function StudioCard({ studio, events, onOpen }) {
  return (
    <button
      onClick={() => onOpen(studio)}
      className="w-full text-left"
    >
      <GlassCard hover className="flex items-center gap-3 px-5 py-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
          {(studio.name[0] || '?').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{studio.name}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </p>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
      </GlassCard>
    </button>
  )
}

function StudioDetailModal({ studio, events, onClose, onEdit, onSoftDelete, onHardDelete }) {
  const { data: summaryRes, isLoading } = useQuery({
    queryKey: ['tenant-summary', studio?.tenant_id],
    queryFn: () => getTenantSummary(studio.tenant_id),
    enabled: !!studio?.tenant_id,
  })
  const summary = summaryRes?.data

  const { data: historyRes, isLoading: historyLoading } = useQuery({
    queryKey: ['tenant-subscription-history', studio?.tenant_id],
    queryFn: () => getTenantSubscriptionHistory(studio.tenant_id),
    enabled: !!studio?.tenant_id,
  })
  const history = historyRes?.data || []

  return (
    <Modal open={!!studio} onClose={onClose} title={studio?.name || 'Studio'} size="xl">
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'var(--bg-elevated)' }}>
          <div className="p-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)' }}>
            <Users size={16} className="text-gold-500" />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Clients</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {isLoading ? '…' : summary?.user_count ?? '—'}
            </p>
          </div>
        </div>
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'var(--bg-elevated)' }}>
          <div className="p-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)' }}>
            <CalendarDays size={16} className="text-gold-500" />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Events</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {isLoading ? '…' : summary?.event_count ?? events.length}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
        Events
      </p>
      <div className="rounded-xl overflow-hidden max-h-[35vh] overflow-y-auto mb-5" style={{ border: '1px solid var(--border-subtle)' }}>
        {events.map(ev => (
          <EventRow
            key={ev.event_id}
            event={ev}
            onEdit={onEdit}
            onSoftDelete={onSoftDelete}
            onHardDelete={onHardDelete}
          />
        ))}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
        <History size={12} /> Purchased Plans History
      </p>
      <div className="rounded-xl overflow-hidden max-h-[30vh] overflow-y-auto" style={{ border: '1px solid var(--border-subtle)' }}>
        {historyLoading ? (
          <div className="p-4"><SkeletonLoader type="table-row" /></div>
        ) : history.length === 0 ? (
          <p className="text-sm p-4 text-center" style={{ color: 'var(--text-tertiary)' }}>No plans purchased yet.</p>
        ) : history.map(h => (
          <div key={h.tenant_subscription_id}
            className="flex items-center justify-between gap-3 px-4 py-2.5 border-b last:border-b-0"
            style={{ borderColor: 'var(--border-subtle)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{planLabel(h)}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {formatDate(h.starts_at)}{h.expires_at ? ` – ${formatDate(h.expires_at)}` : ''}
              </p>
            </div>
            <Badge variant={planStatusVariant(h.status)}>{h.status}</Badge>
          </div>
        ))}
      </div>
    </Modal>
  )
}

export default function AdminEvents() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [editingEvent, setEditingEvent] = useState(null)
  const [openStudio, setOpenStudio] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-events', page],
    queryFn: () => getEvents({ page, limit: 100 })
  })

  const items = data?.data?.items || []
  const total = data?.data?.total || 0
  const pages = data?.data?.pages || 1

  // Group events by studio — clicking a studio opens its detail (client count,
  // event count, event list) instead of dumping every studio's events on screen
  // pre-expanded, which was the "confusing" part.
  const groups = useMemo(() => {
    const map = new Map()
    for (const ev of items) {
      const tenantId = ev.owner_studio?.tenant_id || 'unassigned'
      const studioName = ev.owner_studio?.tenant_studio_name || 'Unassigned'
      if (!map.has(tenantId)) map.set(tenantId, { tenant_id: ev.owner_studio?.tenant_id || null, name: studioName, events: [] })
      map.get(tenantId).events.push(ev)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

  const openGroup = groups.find(g => g.tenant_id === openStudio?.tenant_id)

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
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
            {groups.map(g => (
              <StudioCard
                key={g.tenant_id || g.name}
                studio={g}
                events={g.events}
                onOpen={setOpenStudio}
              />
            ))}
          </div>

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

      {openGroup && (
        <StudioDetailModal
          studio={openStudio}
          events={openGroup.events}
          onClose={() => setOpenStudio(null)}
          onEdit={ev => setEditingEvent(ev)}
          onSoftDelete={handleSoftDelete}
          onHardDelete={handleHardDelete}
        />
      )}

      <CreateEventModal
        open={!!editingEvent}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onCreated={() => { qc.invalidateQueries(['admin-events']); setEditingEvent(null) }}
      />
    </AppLayout>
  )
}
