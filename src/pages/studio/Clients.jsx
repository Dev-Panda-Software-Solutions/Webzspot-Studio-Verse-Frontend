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
import { confirmDialog } from '../../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'
import { TableToolbar, TablePagination } from '../../components/ui/TableControls'

const toDateInput = (value) => value ? new Date(value).toISOString().split('T')[0] : ''

function ClientStatus({ client }) {
  if (!client.isactive) return <Badge variant="error">Archived</Badge>
  if (client.expiry_date) {
    return <Badge variant={isExpired(client.expiry_date) ? 'error' : 'success'}>
      {isExpired(client.expiry_date) ? 'Expired' : 'Active'}
    </Badge>
  }
  return <Badge variant="success">Active</Badge>
}

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
    <div className="flex flex-col gap-3 px-4 py-3 border-b last:border-b-0 sm:flex-row sm:items-center" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium break-words" style={{ color: 'var(--text-primary)' }}>{mapping.event?.event_name || 'Untitled event'}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          <Badge variant={mapping.isactive ? 'success' : 'error'}>{mapping.isactive ? 'Active' : 'Revoked'}</Badge>
        </p>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:max-w-xs">
        <input
          type="date"
          value={expiry}
          disabled={saving}
          onChange={e => setExpiry(e.target.value)}
          className="min-w-0 flex-1 text-xs rounded-lg px-2 py-1.5 outline-none"
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
         <div className="rounded-xl overflow-hidden max-h-[55vh] overflow-y-auto popup-scrollbar" style={{ border: '1px solid var(--border-subtle)' }}>
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
        <div className="modal-actions flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <GoldButton type="submit" loading={saving} className="w-full sm:flex-1 justify-center">Save Changes</GoldButton>
          <GoldButton type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto justify-center">Cancel</GoldButton>
        </div>
      </form>
    </Modal>
  )
}

export default function Clients() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name')
  const [status, setStatus] = useState('active')
  const [eventsModalClient, setEventsModalClient] = useState(null)
  const [editingClient, setEditingClient] = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-users', page, pageSize, status, search, sort],
    queryFn: () => getUsers({ page, limit: pageSize, status, search: search.trim() || undefined, sort: sort === 'name' ? 'user_name' : sort })
  })
  const items = data?.data?.items || []
  const total = data?.data?.total || 0
  const pages = data?.data?.pages || 1

  const handleSoftDelete = async (userId, userName) => {
    const ok = await confirmDialog({
      title: 'Archive client?',
      message: `Archive "${userName}"? They will immediately lose access to every event, but nothing is deleted.`,
      confirmLabel: 'Archive',
      danger: false,
    })
    if (!ok) return
    try {
      await deleteUser(userId)
      toast.success('Client archived')
      qc.invalidateQueries(['tenant-users'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed') }
  }

  const handleRestore = async (userId, userName) => {
    const ok = await confirmDialog({
      title: 'Restore client?',
      message: `Restore "${userName}"? Their account will be reactivated (per-event access is managed separately).`,
      confirmLabel: 'Restore',
      danger: false,
    })
    if (!ok) return
    try {
      await restoreUser(userId)
      toast.success('Client restored')
      qc.invalidateQueries(['tenant-users'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed') }
  }

  const handleHardDelete = async (userId, userName) => {
    const ok = await confirmDialog({
      title: 'Delete client permanently?',
      message: `Permanently delete "${userName}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    try {
      await hardDeleteUser(userId)
      toast.success('Client permanently deleted')
      qc.invalidateQueries(['tenant-users'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed') }
  }

  return (
    <AppLayout
      title="Clients"
      subtitle={`${total} clients - manage accounts and their event access in one place`}
      actions={<GoldButton size="sm" className="w-full sm:w-auto justify-center" onClick={() => setAddOpen(true)} icon={<UserPlus size={14} />}>Add Client</GoldButton>}
    >
      <div className="flex w-full sm:w-fit gap-1 p-1 rounded-xl mb-4" style={{ background: 'var(--bg-elevated)' }}>
        {[
          { key: 'active', label: 'Active' },
          { key: 'archived', label: 'Archived' },
          { key: 'all', label: 'All' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setStatus(key); setPage(1) }}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
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

      <TableToolbar value={search} onChange={value => { setSearch(value); setPage(1) }} placeholder="Search clients by name, email or phone…" sortValue={sort} onSortChange={value => { setSort(value); setPage(1) }} sortOptions={[{ value: 'name', label: 'Sort: Name' }, { value: 'createdAt', label: 'Sort: Newest' }]} pageSize={pageSize} onPageSizeChange={size => { setPageSize(size); setPage(1) }} resultCount={total} />

      <GlassCard hover={false} className="p-0 overflow-hidden">
        <div className="hidden overflow-x-auto xl:block">
          <table className="w-full table-fixed">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['S.No', 'Client', 'Email', 'Events', 'Expires', 'Status', ''].map(h => (
                  <th key={h} className={`${h === 'S.No' ? 'w-10 px-2' : 'px-4'} py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-4">
                  {[...Array(6)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  No clients yet - add one to get started.
                </td></tr>
              ) : items.map((u, index) => (
                <tr key={u.user_id} className="border-b hover:bg-[var(--bg-elevated)] transition-colors group"
                  style={{ borderColor: 'var(--border-subtle)' }}>
                  <td className="w-10 px-2 py-4 text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>{((page - 1) * pageSize) + index + 1}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.user_name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium break-words text-[var(--text-primary)]">{clientDisplayName(u)}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{u.user_phone_number || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm break-all text-[var(--text-secondary)]">{u.user_email_id || '-'}</td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => setEventsModalClient(u)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 transition-colors"
                      style={{ background: 'var(--accent-muted)', color: '#F59E0B' }}
                    >
                      <CalendarDays size={12} />
                      {u.event_names?.length ? `${u.event_names.length} event${u.event_names.length === 1 ? '' : 's'}` : 'Manage events'}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--text-tertiary)]">
                    {u.expiry_date ? formatDate(u.expiry_date) : '-'}
                  </td>
                  <td className="px-4 py-4">
                    <ClientStatus client={u} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
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

        {/* Mobile: compact cards keep every required field visible without
            sideways table scrolling. */}
        <div className="divide-y xl:hidden" style={{ borderColor: 'var(--border-subtle)' }}>
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}
            </div>
          ) : items.length === 0 ? (
            <p className="py-16 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              No clients yet - add one to get started.
            </p>
          ) : items.map((u, index) => (
            <div key={u.user_id} className="p-4">
              <div className="grid grid-cols-[22px_minmax(0,1fr)] gap-2">
                <div className="pt-1 text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                  {((page - 1) * pageSize) + index + 1}
                </div>
                <div className="min-w-0">
                  <div className="flex items-start gap-2">
                    <Avatar name={u.user_name} size="sm" />
                    <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2 flex-nowrap">
                    <p className="min-w-0 flex-1 text-sm font-semibold break-words" style={{ color: 'var(--text-primary)' }}>
                      {clientDisplayName(u)}
                    </p>
                    <span className="flex-shrink-0">
                      <ClientStatus client={u} />
                    </span>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {u.user_email_id || u.user_phone_number || '-'}
                  </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <button onClick={() => setEditingClient(u)} title="Edit client details" className="p-1 rounded" style={{ color: 'var(--text-tertiary)' }}>
                      <Pencil size={13} />
                    </button>
                    {u.isactive ? (
                      <button onClick={() => handleSoftDelete(u.user_id, u.user_name)} title="Archive client" className="p-1 rounded" style={{ color: 'var(--text-tertiary)' }}>
                        <UserX size={13} />
                      </button>
                    ) : (
                      <button onClick={() => handleRestore(u.user_id, u.user_name)} title="Restore client" className="p-1 rounded" style={{ color: 'var(--text-tertiary)' }}>
                        <RotateCcw size={13} />
                      </button>
                    )}
                    <button onClick={() => handleHardDelete(u.user_id, u.user_name)} title="Permanently delete" className="p-1 rounded" style={{ color: 'var(--text-tertiary)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setEventsModalClient(u)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5"
                      style={{ background: 'var(--accent-muted)', color: '#F59E0B' }}
                    >
                      <CalendarDays size={12} />
                      {u.event_names?.length ? `${u.event_names.length} event${u.event_names.length === 1 ? '' : 's'}` : 'Manage events'}
                    </button>
                    <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
                      {u.expiry_date ? `Expires ${formatDate(u.expiry_date)}` : 'No expiry'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <TablePagination page={page} pages={pages} total={total} onPageChange={setPage} />
      </GlassCard>

      <ClientEventsModal client={eventsModalClient} onClose={() => setEventsModalClient(null)} />
      <EditClientModal client={editingClient} onClose={() => setEditingClient(null)} />
      <QuickAddClientModal open={addOpen} onClose={() => setAddOpen(false)} />
    </AppLayout>
  )
}
