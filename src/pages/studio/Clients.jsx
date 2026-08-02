import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserX, RotateCcw, Trash2, CalendarDays, Ban, CheckCircle2, UserPlus, Pencil } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import GlassCard from '../../components/ui/GlassCard'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import Badge from '../../components/ui/Badge'
import GoldButton from '../../components/ui/GoldButton'
import GoldInput from '../../components/ui/GoldInput'
import Avatar from '../../components/ui/Avatar'
import Modal from '../../components/ui/Modal'
import QuickAddClientModal from '../../components/events/QuickAddClientModal'
import { getUsers, updateUser, deleteUser, hardDeleteUser, restoreUser } from '../../api/users'
import { getEventsByUser, updateEventUserMapping } from '../../api/events'
import { formatDate, isExpired, clientDisplayName } from '../../utils/formatters'
import toast from 'react-hot-toast'

const toDateInput = (value) => value ? new Date(value).toISOString().split('T')[0] : ''

function MappingRow({ mapping, onChanged }) {
  const [expiry, setExpiry] = useState(toDateInput(mapping.access_expires))
  const [saving, setSaving] = useState(false)

  const toggleAccess = async () => {
    setSaving(true)
    try {
      await updateEventUserMapping(mapping.event_user_id, { isactive: !mapping.isactive })
      toast.success(mapping.isactive ? 'Access to this event revoked' : 'Access to this event restored')
      onChanged()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Could not update access') }
    finally { setSaving(false) }
  }

  const saveExpiry = async () => {
    setSaving(true)
    try {
      await updateEventUserMapping(mapping.event_user_id, { access_expires: expiry || null })
      toast.success('Access expiry updated')
      onChanged()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Could not update expiry') }
    finally { setSaving(false) }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{mapping.event?.event_name || 'Untitled event'}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          <Badge variant={mapping.isactive ? 'success' : 'error'}>{mapping.isactive ? 'Active' : 'Revoked'}</Badge>
        </p>
      </div>
      <input
        type="date"
        value={expiry}
        disabled={saving}
        onChange={e => setExpiry(e.target.value)}
        className="text-xs rounded-lg px-2 py-1.5 outline-none"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
      />
      <button
        type="button" disabled={saving} onClick={saveExpiry}
        className="text-xs font-semibold rounded-lg px-2.5 py-1.5 disabled:opacity-50"
        style={{ background: 'var(--accent-muted)', color: '#F59E0B' }}
      >
        Save
      </button>
      <button
        type="button" disabled={saving} onClick={toggleAccess}
        title={mapping.isactive ? 'Revoke access to this event' : 'Restore access to this event'}
        className="p-2 rounded-lg disabled:opacity-50"
        style={{
          background: mapping.isactive ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)',
          color: mapping.isactive ? '#F87171' : '#34D399',
        }}
      >
        {mapping.isactive ? <Ban size={14} /> : <CheckCircle2 size={14} />}
      </button>
    </div>
  )
}

function ClientEventsModal({ client, onClose }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['client-events', client?.user_id],
    queryFn: () => getEventsByUser(client.user_id),
    enabled: !!client,
  })
  const mappings = data?.data || []

  return (
    <Modal open={!!client} onClose={onClose} title={client ? `${client.user_name}'s Events` : 'Events'} size="lg">
      {isLoading ? (
        <SkeletonLoader type="table-row" />
      ) : mappings.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--text-tertiary)' }}>Not assigned to any event yet.</p>
      ) : (
        <div className="rounded-xl overflow-hidden max-h-[55vh] overflow-y-auto" style={{ border: '1px solid var(--border-subtle)' }}>
          {mappings.map(m => (
            <MappingRow
              key={m.event_user_id}
              mapping={m}
              onChanged={() => qc.invalidateQueries(['client-events', client.user_id])}
            />
          ))}
        </div>
      )}
    </Modal>
  )
}

function EditClientModal({ client, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ user_name: '', user_email_id: '', user_phone_number: '', expiry_date: '' })
  const [saving, setSaving] = useState(false)

  // Re-seed the form whenever a different client is opened for editing.
  React.useEffect(() => {
    if (!client) return
    setForm({
      user_name: client.user_name || '',
      user_email_id: client.user_email_id || '',
      user_phone_number: client.user_phone_number || '',
      expiry_date: toDateInput(client.expiry_date),
    })
  }, [client])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateUser(client.user_id, {
        user_name: form.user_name,
        user_email_id: form.user_email_id?.trim() || null,
        user_phone_number: form.user_phone_number?.trim() || null,
        expiry_date: form.expiry_date || undefined,
      })
      toast.success('Client updated')
      qc.invalidateQueries(['tenant-users'])
      onClose()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to update client') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={!!client} onClose={onClose} title="Edit Client">
      <form onSubmit={handleSave}>
        <GoldInput label="Full Name *" name="user_name" value={form.user_name} onChange={e => update('user_name', e.target.value)} />
        <GoldInput label="Email" name="user_email_id" type="email" value={form.user_email_id} onChange={e => update('user_email_id', e.target.value)} />
        <GoldInput label="Phone" name="user_phone_number" value={form.user_phone_number} onChange={e => update('user_phone_number', e.target.value)} />
        <div className="mb-4">
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Account Expiry
          </label>
          <input
            type="date"
            value={form.expiry_date}
            onChange={e => update('expiry_date', e.target.value)}
            className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <GoldButton type="submit" loading={saving} className="flex-1">Save Changes</GoldButton>
          <GoldButton type="button" variant="ghost" onClick={onClose}>Cancel</GoldButton>
        </div>
      </form>
    </Modal>
  )
}

export default function Clients() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('active')
  const [eventsModalClient, setEventsModalClient] = useState(null)
  const [editingClient, setEditingClient] = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-users', page, status],
    queryFn: () => getUsers({ page, limit: 15, status })
  })
  const items = data?.data?.items || []
  const total = data?.data?.total || 0
  const pages = data?.data?.pages || 1

  const handleSoftDelete = async (userId, userName) => {
    if (!window.confirm(`Archive "${userName}"? They will immediately lose access to every event, but nothing is deleted.`)) return
    try {
      await deleteUser(userId)
      toast.success('Client archived')
      qc.invalidateQueries(['tenant-users'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed') }
  }

  const handleRestore = async (userId, userName) => {
    if (!window.confirm(`Restore "${userName}"? Their account will be reactivated (per-event access is managed separately).`)) return
    try {
      await restoreUser(userId)
      toast.success('Client restored')
      qc.invalidateQueries(['tenant-users'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed') }
  }

  const handleHardDelete = async (userId, userName) => {
    if (!window.confirm(`Permanently delete "${userName}"? This cannot be undone.`)) return
    try {
      await hardDeleteUser(userId)
      toast.success('Client permanently deleted')
      qc.invalidateQueries(['tenant-users'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed') }
  }

  return (
    <AppLayout
      title="Clients"
      subtitle={`${total} clients — manage accounts and their event access in one place`}
      actions={<GoldButton onClick={() => setAddOpen(true)} icon={<UserPlus size={14} />}>Add Client</GoldButton>}
    >
      <div className="flex gap-1 p-1 rounded-xl mb-4 w-fit" style={{ background: 'var(--bg-elevated)' }}>
        {[
          { key: 'active', label: 'Active' },
          { key: 'archived', label: 'Archived' },
          { key: 'all', label: 'All' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setStatus(key); setPage(1) }}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: status === key ? 'var(--bg-surface)' : 'transparent',
              color: status === key ? '#F59E0B' : 'var(--text-secondary)',
              boxShadow: status === key ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <GlassCard hover={false} className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['Client', 'Email', 'Events', 'Expires', 'Status', ''].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-4">
                  {[...Array(6)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  No clients yet — add one to get started.
                </td></tr>
              ) : items.map(u => (
                <tr key={u.user_id} className="border-b hover:bg-[var(--bg-elevated)] transition-colors group"
                  style={{ borderColor: 'var(--border-subtle)' }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.user_name} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{clientDisplayName(u)}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{u.user_phone_number || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{u.user_email_id || '—'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setEventsModalClient(u)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 transition-colors"
                      style={{ background: 'var(--accent-muted)', color: '#F59E0B' }}
                    >
                      <CalendarDays size={12} />
                      {u.event_names?.length ? `${u.event_names.length} event${u.event_names.length === 1 ? '' : 's'}` : 'Manage events'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-tertiary)]">
                    {u.expiry_date ? formatDate(u.expiry_date) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {!u.isactive
                      ? <Badge variant="error">Archived</Badge>
                      : u.expiry_date
                        ? <Badge variant={isExpired(u.expiry_date) ? 'error' : 'success'}>
                            {isExpired(u.expiry_date) ? 'Expired' : 'Active'}
                          </Badge>
                        : <Badge variant="success">Active</Badge>
                    }
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingClient(u)}
                        title="Edit client details"
                        className="p-1.5 rounded transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#93C5FD'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                      >
                        <Pencil size={14} />
                      </button>
                      {u.isactive ? (
                        <button
                          onClick={() => handleSoftDelete(u.user_id, u.user_name)}
                          title="Archive client"
                          className="p-1.5 rounded transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#FBBF24'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                        >
                          <UserX size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(u.user_id, u.user_name)}
                          title="Restore client"
                          className="p-1.5 rounded transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#34D399'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleHardDelete(u.user_id, u.user_name)}
                        title="Permanently delete"
                        className="p-1.5 rounded transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <p className="text-xs text-[var(--text-tertiary)]">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <GoldButton size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</GoldButton>
              <GoldButton size="sm" variant="outline" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>→</GoldButton>
            </div>
          </div>
        )}
      </GlassCard>

      <ClientEventsModal client={eventsModalClient} onClose={() => setEventsModalClient(null)} />
      <EditClientModal client={editingClient} onClose={() => setEditingClient(null)} />
      <QuickAddClientModal open={addOpen} onClose={() => setAddOpen(false)} />
    </AppLayout>
  )
}
