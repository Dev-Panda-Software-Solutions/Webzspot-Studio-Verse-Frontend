import React, { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock, CheckCircle2, Ban, Search, Users, UserPlus, LayoutGrid,
  ArrowRight, Clock3
} from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import { assignUserToEvent, getEventUsers, getEvents, updateEventUserMapping } from '../../api/events'
import { getUsers } from '../../api/users'
import { formatDate } from '../../utils/formatters'
import toast from 'react-hot-toast'

const today = new Date()

const accessState = (mapping) => {
  if (!mapping?.isactive) return { label: 'Revoked', variant: 'error' }
  if (mapping.access_expires && new Date(mapping.access_expires) < today) return { label: 'Expired', variant: 'error' }
  if (mapping.access_expires) return { label: `Until ${formatDate(mapping.access_expires)}`, variant: 'success' }
  return { label: 'Active', variant: 'success' }
}

const toDateInput = (value) => value ? new Date(value).toISOString().split('T')[0] : ''

function ClientAccessCard({ mapping, onUpdate }) {
  const [expiry, setExpiry] = useState(toDateInput(mapping.access_expires))
  const [saving, setSaving] = useState(false)
  const state = accessState(mapping)
  const user = mapping.user || {}

  const saveExpiry = async () => {
    setSaving(true)
    try {
      await onUpdate(mapping.event_user_id, { access_expires: expiry || null })
      toast.success('Access expiry updated')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Could not update access')
    } finally {
      setSaving(false)
    }
  }

  const toggleAccess = async () => {
    setSaving(true)
    try {
      await onUpdate(mapping.event_user_id, { isactive: !mapping.isactive })
      toast.success(mapping.isactive ? 'Client access revoked' : 'Client access restored')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Could not update access')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="rounded-xl p-3 transition-colors"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-start gap-3">
        <Avatar name={user.user_name || 'Client'} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {user.user_name || 'Unnamed client'}
            </p>
            <Badge variant={state.variant}>{state.label}</Badge>
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
            {user.user_email_id || user.user_phone_number || 'No contact saved'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <label className="text-[10px] block mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Expiry
          </label>
          <input
            type="date"
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
            className="w-full rounded-lg px-2.5 py-2 text-xs outline-none"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
            }}
          />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={saveExpiry}
          className="rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
          style={{ background: 'var(--accent-muted)', color: '#F59E0B' }}
        >
          Save
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={toggleAccess}
          className="rounded-lg p-2 disabled:opacity-50"
          style={{
            background: mapping.isactive ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)',
            color: mapping.isactive ? '#F87171' : '#34D399',
          }}
          title={mapping.isactive ? 'Revoke access' : 'Restore access'}
        >
          {mapping.isactive ? <Ban size={14} /> : <CheckCircle2 size={14} />}
        </button>
      </div>
    </div>
  )
}

function UnassignedClient({ user, eventId, onAssigned }) {
  const [expiry, setExpiry] = useState('')
  const [saving, setSaving] = useState(false)

  const assign = async () => {
    setSaving(true)
    try {
      await assignUserToEvent({
        event_id: eventId,
        user_id: user.user_id,
        access_expires: expiry || undefined,
      })
      toast.success(`${user.user_name} assigned`)
      onAssigned?.()
      setExpiry('')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Could not assign client')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-3">
        <Avatar name={user.user_name || 'Client'} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user.user_name}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{user.user_email_id || user.user_phone_number || 'No contact saved'}</p>
        </div>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <input
          type="date"
          value={expiry}
          onChange={e => setExpiry(e.target.value)}
          className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-xs outline-none"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
        />
        <button
          type="button"
          disabled={saving}
          onClick={assign}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
          style={{ background: '#F59E0B', color: '#111113' }}
        >
          Add <ArrowRight size={12} />
        </button>
      </div>
    </div>
  )
}

function EventColumn({ event, mappings, selected, onSelect, onUpdate }) {
  const activeCount = mappings.filter(m => m.isactive).length
  const expiredCount = mappings.filter(m => m.isactive && m.access_expires && new Date(m.access_expires) < today).length

  return (
    <div
      className="min-w-[320px] max-w-[360px] rounded-2xl flex flex-col"
      style={{
        background: selected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        border: selected ? '1px solid rgba(245,158,11,0.45)' : '1px solid var(--border-subtle)',
        boxShadow: selected ? '0 0 0 1px rgba(245,158,11,0.12)' : 'none',
      }}
    >
      <button type="button" onClick={onSelect} className="text-left p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {event.event_name}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {event.event_date ? formatDate(event.event_date) : 'No event date'}
            </p>
          </div>
          <div className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{ background: 'var(--accent-muted)', color: '#F59E0B' }}>
            {mappings.length}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: '#34D399' }}>
            <CheckCircle2 size={11} /> {activeCount} active
          </span>
          <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: expiredCount ? '#F87171' : 'var(--text-tertiary)' }}>
            <Clock3 size={11} /> {expiredCount} expired
          </span>
        </div>
      </button>

      <div className="p-3 space-y-3 overflow-y-auto" style={{ maxHeight: '58vh' }}>
        {mappings.length === 0 ? (
          <div className="rounded-xl px-4 py-8 text-center" style={{ background: 'var(--bg-elevated)' }}>
            <Users size={24} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No clients assigned</p>
          </div>
        ) : mappings.map(mapping => (
          <ClientAccessCard key={mapping.event_user_id} mapping={mapping} onUpdate={onUpdate} />
        ))}
      </div>
    </div>
  )
}

export default function AccessBoard() {
  const qc = useQueryClient()
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [search, setSearch] = useState('')

  const { data: eventData, isLoading: eventsLoading } = useQuery({
    queryKey: ['access-board-events'],
    queryFn: () => getEvents({ page: 1, limit: 100 }),
  })

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['tenant-users'],
    queryFn: () => getUsers({ page: 1, limit: 300 }),
  })

  const events = eventData?.data?.items || []
  const users = usersData?.data?.items || []
  const activeEventId = selectedEventId || events[0]?.event_id || null

  const { data: boardData, isLoading: mappingsLoading } = useQuery({
    queryKey: ['access-board-mappings', events.map(e => e.event_id).join('|')],
    queryFn: async () => {
      const entries = await Promise.all(events.map(async event => {
        const res = await getEventUsers(event.event_id)
        return [event.event_id, res?.data || []]
      }))
      return Object.fromEntries(entries)
    },
    enabled: events.length > 0,
  })

  const mappingsByEvent = boardData || {}
  const activeMappings = mappingsByEvent[activeEventId] || []
  const assignedIds = new Set(activeMappings.map(m => m.user?.user_id).filter(Boolean))
  const unassigned = users.filter(user => !assignedIds.has(user.user_id))
  const filteredUnassigned = unassigned.filter(user => {
    const text = `${user.user_name || ''} ${user.user_email_id || ''} ${user.user_phone_number || ''}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  const totals = useMemo(() => {
    const all = Object.values(mappingsByEvent).flat()
    return {
      assignments: all.length,
      active: all.filter(m => m.isactive).length,
      revoked: all.filter(m => !m.isactive).length,
      expired: all.filter(m => m.isactive && m.access_expires && new Date(m.access_expires) < today).length,
    }
  }, [mappingsByEvent])

  const refreshBoard = () => {
    qc.invalidateQueries(['access-board-mappings'])
    qc.invalidateQueries(['event-users'])
  }

  const updateMapping = async (mappingId, data) => {
    await updateEventUserMapping(mappingId, data)
    refreshBoard()
  }

  const activeEvent = events.find(event => event.event_id === activeEventId)
  const loading = eventsLoading || usersLoading || mappingsLoading

  return (
    <AppLayout
      title="Client Access Board"
      subtitle="Map clients to events and control gallery access from one place"
      actions={<GoldButton icon={<LayoutGrid size={14} />} onClick={refreshBoard}>Refresh</GoldButton>}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Events', value: events.length, icon: CalendarClock },
            { label: 'Clients', value: users.length, icon: Users },
            { label: 'Active Access', value: totals.active, icon: CheckCircle2 },
            { label: 'Revoked / Expired', value: `${totals.revoked}/${totals.expired}`, icon: Ban },
          ].map(({ label, value, icon: Icon }) => (
            <GlassCard key={label} hover={false} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-muted)', color: '#F59E0B' }}>
                  <Icon size={18} />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {loading ? (
          <SkeletonLoader type="page" />
        ) : events.length === 0 ? (
          <GlassCard hover={false} className="py-16 text-center">
            <CalendarClock size={36} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Create an event first to start mapping clients.</p>
          </GlassCard>
        ) : (
          <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
            <div className="overflow-x-auto pb-3">
              <div className="flex gap-4 min-h-[520px]">
                {events.map(event => (
                  <EventColumn
                    key={event.event_id}
                    event={event}
                    mappings={mappingsByEvent[event.event_id] || []}
                    selected={event.event_id === activeEventId}
                    onSelect={() => setSelectedEventId(event.event_id)}
                    onUpdate={updateMapping}
                  />
                ))}
              </div>
            </div>

            <GlassCard hover={false} className="sticky top-24">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Add Client</h2>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    {activeEvent ? `To ${activeEvent.event_name}` : 'Select an event'}
                  </p>
                </div>
                <UserPlus size={18} style={{ color: '#F59E0B' }} />
              </div>

              <div className="relative mb-4">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search unassigned clients"
                  className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl outline-none"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                />
              </div>

              <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '58vh' }}>
                {filteredUnassigned.length === 0 ? (
                  <div className="rounded-xl px-4 py-10 text-center" style={{ background: 'var(--bg-elevated)' }}>
                    <CheckCircle2 size={26} className="mx-auto mb-2" style={{ color: '#34D399' }} />
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Every matching client is already assigned to this event.
                    </p>
                  </div>
                ) : filteredUnassigned.map(user => (
                  <UnassignedClient
                    key={user.user_id}
                    user={user}
                    eventId={activeEventId}
                    onAssigned={refreshBoard}
                  />
                ))}
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
