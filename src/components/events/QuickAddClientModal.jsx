import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, CheckCircle2, UserCheck, UserPlus } from 'lucide-react'
import Modal from '../ui/Modal'
import GoldButton from '../ui/GoldButton'
import GoldInput from '../ui/GoldInput'
import PasswordStrength from '../ui/PasswordStrength'
import Avatar from '../ui/Avatar'
import { getEvents, assignUserToEvent } from '../../api/events'
import { getUsers, createUserInEvent } from '../../api/users'
import { clientDisplayName } from '../../utils/formatters'
import toast from 'react-hot-toast'

const EMPTY_NEW_CLIENT = { user_name: '', username: '', password: '', user_email_id: '', user_phone_number: '' }

// Global shortcut version of EventDetail's AddClientModal — adds an event
// picker up front so it can be triggered from anywhere (the sidebar), not
// just from within a specific event's page.
export default function QuickAddClientModal({ open, onClose }) {
  const qc = useQueryClient()
  const [eventId, setEventId] = useState('')
  const [mode, setMode] = useState('existing')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [accessExpires, setAccessExpires] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [newClient, setNewClient] = useState(EMPTY_NEW_CLIENT)
  const [creating, setCreating] = useState(false)

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['quick-add-events'],
    queryFn: () => getEvents({ page: 1, limit: 100 }),
    enabled: open,
  })
  const events = eventsData?.data?.items || []

  const { data: usersData } = useQuery({
    queryKey: ['tenant-users'],
    queryFn: () => getUsers({ page: 1, limit: 100 }),
    enabled: open && mode === 'existing' && !!eventId,
  })
  const allUsers = usersData?.data?.items || []
  const filtered = allUsers.filter(u =>
    !search ||
    u.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.user_email_id?.toLowerCase().includes(search.toLowerCase())
  )

  const reset = () => {
    setEventId('')
    setMode('existing')
    setSearch('')
    setSelected(null)
    setAccessExpires('')
    setNewClient(EMPTY_NEW_CLIENT)
  }

  const handleClose = () => { reset(); onClose() }

  const handleAssignExisting = async () => {
    if (!selected || !eventId) return
    setAssigning(true)
    try {
      await assignUserToEvent({ event_id: eventId, user_id: selected.user_id, access_expires: accessExpires || undefined })
      toast.success(`${selected.user_name} added to event`)
      qc.invalidateQueries(['event-users', eventId])
      handleClose()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to assign client') }
    finally { setAssigning(false) }
  }

  const handleCreateNew = async (e) => {
    e.preventDefault()
    if (!eventId) return
    setCreating(true)
    try {
      await createUserInEvent({
        user_name: newClient.user_name,
        username: newClient.username,
        password: newClient.password,
        ...(newClient.user_email_id?.trim() ? { user_email_id: newClient.user_email_id.trim() } : {}),
        ...(newClient.user_phone_number?.trim() ? { user_phone_number: newClient.user_phone_number.trim() } : {}),
        event_id: eventId,
        validity_days: 365,
        expiry_date: accessExpires
          ? new Date(accessExpires).toISOString().split('T')[0]
          : new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      })
      toast.success('New client created and added to event')
      qc.invalidateQueries(['event-users', eventId])
      qc.invalidateQueries(['tenant-users'])
      handleClose()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to create client') }
    finally { setCreating(false) }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Client" size="md">
      <div className="mb-5">
        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Event *
        </label>
        <select
          value={eventId}
          onChange={e => setEventId(e.target.value)}
          className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
        >
          <option value="">{eventsLoading ? 'Loading events…' : 'Select an event'}</option>
          {events.map(ev => (
            <option key={ev.event_id} value={ev.event_id}>{ev.event_name}</option>
          ))}
        </select>
        {!eventsLoading && events.length === 0 && (
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
            Create an event first before adding clients.
          </p>
        )}
      </div>

      {eventId && (
        <>
          {/* Mode selector */}
          <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: 'var(--bg-elevated)' }}>
            {[
              { key: 'existing', label: 'Existing Client', icon: UserCheck },
              { key: 'new', label: 'New Client', icon: UserPlus },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: mode === key ? 'var(--bg-surface)' : 'transparent',
                  color: mode === key ? '#F59E0B' : 'var(--text-secondary)',
                  boxShadow: mode === key ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {mode === 'existing' && (
            <div>
              <div className="relative mb-3">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search clients by name or email…"
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-xl outline-none"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                />
              </div>

              <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid var(--border-subtle)', maxHeight: 220, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                  <div className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {allUsers.length === 0 ? 'No clients yet — create one first' : 'No matching clients'}
                  </div>
                ) : filtered.map(u => (
                  <button
                    key={u.user_id}
                    type="button"
                    onClick={() => setSelected(selected?.user_id === u.user_id ? null : u)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{
                      background: selected?.user_id === u.user_id ? 'rgba(245,158,11,0.1)' : 'transparent',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                    onMouseEnter={e => { if (selected?.user_id !== u.user_id) e.currentTarget.style.background = 'var(--bg-elevated)' }}
                    onMouseLeave={e => { if (selected?.user_id !== u.user_id) e.currentTarget.style.background = 'transparent' }}
                  >
                    <Avatar name={u.user_name} size="xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{clientDisplayName(u)}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{u.user_email_id || u.user_phone_number || '—'}</p>
                    </div>
                    {selected?.user_id === u.user_id && <CheckCircle2 size={15} className="text-gold-500 flex-shrink-0" />}
                  </button>
                ))}
              </div>

              {selected && (
                <div className="mb-4">
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Access expires (optional — leave empty for no expiry)
                  </label>
                  <input
                    type="date"
                    value={accessExpires}
                    onChange={e => setAccessExpires(e.target.value)}
                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <GoldButton onClick={handleAssignExisting} loading={assigning} disabled={!selected} className="flex-1">
                  {selected ? `Assign ${selected.user_name}` : 'Select a client above'}
                </GoldButton>
                <GoldButton variant="ghost" onClick={handleClose}>Cancel</GoldButton>
              </div>
            </div>
          )}

          {mode === 'new' && (
            <form onSubmit={handleCreateNew}>
              <GoldInput label="Full Name *" name="user_name" value={newClient.user_name}
                onChange={e => setNewClient(f => ({ ...f, user_name: e.target.value }))} />
              <GoldInput label="Email" name="user_email_id" type="email" value={newClient.user_email_id}
                onChange={e => setNewClient(f => ({ ...f, user_email_id: e.target.value }))} />
              <GoldInput label="Phone" name="user_phone_number" value={newClient.user_phone_number}
                onChange={e => setNewClient(f => ({ ...f, user_phone_number: e.target.value }))} />
              <GoldInput label="Login Username *" name="username" value={newClient.username}
                onChange={e => setNewClient(f => ({ ...f, username: e.target.value }))} />
              <GoldInput label="Password *" name="password" type="password" value={newClient.password}
                onChange={e => setNewClient(f => ({ ...f, password: e.target.value }))} />
              <PasswordStrength value={newClient.password} />

              <div className="mb-4">
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Access expires (optional)
                </label>
                <input
                  type="date"
                  value={accessExpires}
                  onChange={e => setAccessExpires(e.target.value)}
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <GoldButton type="submit" loading={creating} className="flex-1">Create &amp; Add to Event</GoldButton>
                <GoldButton type="button" variant="ghost" onClick={handleClose}>Cancel</GoldButton>
              </div>
            </form>
          )}
        </>
      )}
    </Modal>
  )
}
