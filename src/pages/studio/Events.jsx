import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Lock, ChevronLeft, ChevronRight } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import EventCard from '../../components/events/EventCard'
import CreateEventModal from '../../components/events/CreateEventModal'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import { getEvents, deleteEvent, restoreEvent } from '../../api/events'
import { getMySubscription } from '../../api/billing'
import { confirmDialog } from '../../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

const PAGE_SIZE = 12

export default function StudioEvents() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('active')

  const { data, isLoading } = useQuery({
    queryKey: ['events', page, statusFilter],
    queryFn: () => getEvents({ page, limit: PAGE_SIZE, status: statusFilter }),
  })

  const { data: subData } = useQuery({
    queryKey: ['tenant-subscription'],
    queryFn: getMySubscription,
  })

  const events = data?.data?.items || []
  const total = data?.data?.total || 0
  const pages = data?.data?.pages || 1

  const subscription = subData?.data?.subscription
  const quotaUsed = Number(subscription?.photo_quota_used || 0)
  const quotaTotal = Number(subscription?.photo_quota_total || 0)
  const quotaFull = quotaTotal > 0 && quotaUsed >= quotaTotal
  const trialExhausted = subscription?.status === 'TRIAL' && quotaFull

  const invalidateEvents = () => {
    qc.invalidateQueries(['events'])
    qc.invalidateQueries(['dashboard-analytics'])
  }

  const handleArchiveEvent = async (eventId, eventName) => {
    const ok = await confirmDialog({
      title: 'Archive event?',
      message: `Archive "${eventName}"? Clients will immediately lose access and all its photos/videos will be hidden - nothing is deleted, and you can restore it any time.`,
      confirmLabel: 'Archive',
      danger: false,
    })
    if (!ok) return
    try {
      await deleteEvent(eventId)
      toast.success('Event archived')
      invalidateEvents()
    } catch {
      toast.error('Failed to archive event')
    }
  }

  const handleRestoreEvent = async (eventId, eventName) => {
    const ok = await confirmDialog({
      title: 'Restore event?',
      message: `Restore "${eventName}"? Clients will regain access to it and its photos/videos.`,
      confirmLabel: 'Restore',
      danger: false,
    })
    if (!ok) return
    try {
      await restoreEvent(eventId)
      toast.success('Event restored')
      invalidateEvents()
    } catch {
      toast.error('Failed to restore event')
    }
  }

  const changeFilter = (key) => {
    setStatusFilter(key)
    setPage(1)
  }

  return (
    <AppLayout
      title="Events"
      subtitle="Create, manage and open every event gallery from one place"
      actions={trialExhausted
        ? <GoldButton onClick={() => navigate('/studio/billing')} icon={<Lock size={14} />}>Upgrade Plan</GoldButton>
        : <GoldButton onClick={() => setCreateOpen(true)} icon={<Camera size={14} />}>New Event</GoldButton>}
    >
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-elevated)' }}>
          {[
            { key: 'active', label: 'Active' },
            { key: 'archived', label: 'Archived' },
            { key: 'all', label: 'All' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => changeFilter(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: statusFilter === key ? 'var(--bg-surface)' : 'transparent',
                color: statusFilter === key ? '#F59E0B' : 'var(--text-secondary)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {total} event{total === 1 ? '' : 's'}
          </span>
          {pages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40 transition-opacity"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{page} / {pages}</span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                aria-label="Next page"
                className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40 transition-opacity"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <SkeletonLoader key={i} type="event-card" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {events.map(item => (
              <EventCard
                key={item.event_id}
                event={item}
                eventId={item.event_id}
                onEdit={ev => setEditingEvent(ev)}
                onArchive={handleArchiveEvent}
                onRestore={handleRestoreEvent}
              />
            ))}

            {statusFilter !== 'archived' && (
              trialExhausted ? (
                <div
                  className="event-card rounded-xl overflow-hidden min-h-[220px] flex flex-col justify-center items-center text-center p-6"
                  style={{ border: '1px dashed var(--border-default)', background: 'var(--bg-surface)' }}
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ background: 'var(--accent-muted)' }}>
                    <Lock size={26} style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Upload quota used up
                  </p>
                  <p className="text-xs mb-4 max-w-[220px]" style={{ color: 'var(--text-tertiary)' }}>
                    Your trial uploads are finished. Upgrade your plan to keep creating events.
                  </p>
                  <GoldButton size="sm" onClick={() => navigate('/studio/billing')}>
                    Upgrade Plan
                  </GoldButton>
                </div>
              ) : (
                <EventCard isNew onCreate={() => setCreateOpen(true)} />
              )
            )}
          </div>

          {statusFilter === 'archived' && events.length === 0 && (
            <GlassCard hover={false} className="py-12 text-center">
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No archived events</p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
                Events you archive will appear here and can be restored at any time.
              </p>
              <GoldButton size="sm" variant="outline" onClick={() => changeFilter('active')}>
                View active events
              </GoldButton>
            </GlassCard>
          )}
        </>
      )}

      <CreateEventModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={invalidateEvents}
      />
      <CreateEventModal
        open={!!editingEvent}
        event={editingEvent}
        onClose={() => setEditingEvent(null)}
        onCreated={() => { invalidateEvents(); setEditingEvent(null) }}
      />
    </AppLayout>
  )
}
