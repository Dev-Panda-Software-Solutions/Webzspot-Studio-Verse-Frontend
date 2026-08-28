import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, CheckCircle2 } from 'lucide-react'
import Modal from '../ui/Modal'
import GoldButton from '../ui/GoldButton'
import GoldInput from '../ui/GoldInput'
import Avatar from '../ui/Avatar'
import { getUsers, createUser } from '../../api/users'
import toast from 'react-hot-toast'

// A quotation's client is just a User — the same record used for gallery
// login access. "New User" here creates a bare User with no login and no
// event access yet (see backend createUser); "Existing User" searches the
// same client list the Access Board uses, so a client created for a
// quotation shows up there too, and vice versa.
export default function CreateQuotationModal({ open, onClose }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [mode, setMode] = useState('new')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [newClient, setNewClient] = useState({ name: '', contact: '' })
  const [saving, setSaving] = useState(false)

  const { data } = useQuery({
    queryKey: ['tenant-users', search],
    queryFn: () => getUsers({ search, limit: 50 }),
    enabled: open && mode === 'existing',
  })
  const clients = data?.data?.items || []

  const reset = () => {
    setMode('new')
    setSearch('')
    setSelected(null)
    setNewClient({ name: '', contact: '' })
  }
  const handleClose = () => { reset(); onClose() }

  const goToQuotation = (user_id) => {
    handleClose()
    navigate(`/studio/billing-data/quotations/new?client=${user_id}`)
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!newClient.name.trim()) { toast.error('Name is required'); return }
    if (!newClient.contact.trim()) { toast.error('Email or phone is required'); return }
    setSaving(true)
    try {
      const isEmail = newClient.contact.includes('@')
      const res = await createUser({
        user_name: newClient.name.trim(),
        user_email_id: isEmail ? newClient.contact.trim() : undefined,
        user_phone_number: !isEmail ? newClient.contact.trim() : undefined,
      })
      qc.invalidateQueries(['tenant-users'])
      goToQuotation(res?.data?.user_id)
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to create client') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create Quotation">
      <div className="flex gap-5 mb-5">
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
          <input type="radio" checked={mode === 'new'} onChange={() => setMode('new')} />
          For New User
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
          <input type="radio" checked={mode === 'existing'} onChange={() => setMode('existing')} />
          For Existing User
        </label>
      </div>

      {mode === 'new' ? (
        <form onSubmit={handleCreateUser}>
          <GoldInput label="Name *" name="name" value={newClient.name} onChange={e => setNewClient(f => ({ ...f, name: e.target.value }))} />
          <GoldInput label="Email Address or Phone Number *" name="contact" value={newClient.contact} onChange={e => setNewClient(f => ({ ...f, contact: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <GoldButton type="submit" loading={saving} className="flex-1 justify-center">Create User</GoldButton>
            <GoldButton type="button" variant="ghost" onClick={handleClose}>Cancel</GoldButton>
          </div>
        </form>
      ) : (
        <div>
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients by name, email or phone…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl outline-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
            />
          </div>
          <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid var(--border-subtle)', maxHeight: 260, overflowY: 'auto' }}>
            {clients.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No matching clients</div>
            ) : clients.map(c => (
              <button
                key={c.user_id}
                type="button"
                onClick={() => setSelected(selected?.user_id === c.user_id ? null : c)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{
                  background: selected?.user_id === c.user_id ? 'rgba(245,158,11,0.1)' : 'transparent',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <Avatar name={c.user_name} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.user_name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{c.user_email_id || c.user_phone_number || '—'}</p>
                </div>
                {selected?.user_id === c.user_id && <CheckCircle2 size={15} className="text-gold-500 flex-shrink-0" />}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <GoldButton disabled={!selected} onClick={() => goToQuotation(selected.user_id)} className="flex-1 justify-center">
              {selected ? `Continue with ${selected.user_name}` : 'Select a client above'}
            </GoldButton>
            <GoldButton variant="ghost" onClick={handleClose}>Cancel</GoldButton>
          </div>
        </div>
      )}
    </Modal>
  )
}
