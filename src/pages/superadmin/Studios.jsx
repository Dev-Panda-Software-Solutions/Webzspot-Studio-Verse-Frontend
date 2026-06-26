import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Trash2 } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/layout/PageHeader'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import GoldInput from '../../components/ui/GoldInput'
import PasswordStrength from '../../components/ui/PasswordStrength'
import { getTenants, createTenant, deleteTenant } from '../../api/tenants'
import { formatDate } from '../../utils/formatters'
import toast from 'react-hot-toast'

export default function AdminStudios() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ tenant_studio_name: '', tenant_name: '', tenant_email_id: '', tenant_phone_number: '', username: '', password: '' })
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', page],
    queryFn: () => getTenants({ page, limit: 10 })
  })

  const items = data?.data?.items || []
  const total = data?.data?.total || 0
  const pages = data?.data?.pages || 1

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await createTenant(form)
      toast.success('Studio created')
      qc.invalidateQueries(['tenants'])
      setCreateOpen(false)
      setForm({ tenant_studio_name: '', tenant_name: '', tenant_email_id: '', tenant_phone_number: '', username: '', password: '' })
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to create studio') }
    finally { setCreating(false) }
  }

  const handleDelete = async (tenantId) => {
    if (!window.confirm('Delete this studio?')) return
    try {
      await deleteTenant(tenantId)
      toast.success('Studio deleted')
      qc.invalidateQueries(['tenants'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed') }
  }

  return (
    <AppLayout
      title="Studios"
      subtitle={`${total} total studios on the platform`}
      actions={<GoldButton onClick={() => setCreateOpen(true)}>+ Add Studio</GoldButton>}
    >

      <GlassCard hover={false} className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['Studio', 'Owner', 'Email', 'Created', 'Status', ''].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-4">
                  {[...Array(5)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}
                </td></tr>
              ) : items.map(t => (
                <tr key={t.tenant_id}
                  className="border-b hover:bg-[var(--bg-elevated)] transition-colors group"
                  style={{ borderColor: 'var(--border-subtle)' }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
                        <Building2 size={14} className="text-gold-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{t.tenant_studio_name}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{t.tenant_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{t.tenant_name}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{t.tenant_email_id || '—'}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-tertiary)]">{formatDate(t.createdAt)}</td>
                  <td className="px-6 py-4">
                    <Badge variant={t.isactive ? 'success' : 'error'}>{t.isactive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDelete(t.tenant_id)}
                        className="p-1.5 text-[var(--text-tertiary)] hover:text-red-400 transition-colors">
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Studio">
        <form onSubmit={handleCreate}>
          <GoldInput label="Studio Name *" name="tenant_studio_name" value={form.tenant_studio_name} onChange={e => update('tenant_studio_name', e.target.value)} />
          <GoldInput label="Owner Name *" name="tenant_name" value={form.tenant_name} onChange={e => update('tenant_name', e.target.value)} />
          <GoldInput label="Email" name="tenant_email_id" type="email" value={form.tenant_email_id} onChange={e => update('tenant_email_id', e.target.value)} />
          <GoldInput label="Phone" name="tenant_phone_number" value={form.tenant_phone_number} onChange={e => update('tenant_phone_number', e.target.value)} />
          <GoldInput label="Username *" name="username" value={form.username} onChange={e => update('username', e.target.value)} />
          <GoldInput label="Password *" name="password" type="password" value={form.password} onChange={e => update('password', e.target.value)} />
          <PasswordStrength value={form.password} />
          <div className="flex gap-3 pt-2">
            <GoldButton type="submit" loading={creating} className="flex-1">Create</GoldButton>
            <GoldButton type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</GoldButton>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
