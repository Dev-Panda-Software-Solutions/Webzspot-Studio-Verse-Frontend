import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Archive, Trash2, RotateCcw, Copy, CheckCircle2, HardDriveDownload, Eye } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/layout/PageHeader'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import GoldInput from '../../components/ui/GoldInput'
import StudioDetailModal from '../../components/superadmin/StudioDetailModal'
import FreeAccessGrantFields from '../../components/superadmin/FreeAccessGrantFields'
import { confirmDialog } from '../../components/ui/ConfirmDialog'
import { getTenants, createTenant, deleteTenant, hardDeleteTenant, restoreTenant, deleteTenantStorage } from '../../api/tenants'
import { getDashboardAnalytics } from '../../api/events'
import { formatDate, formatFileSize, planLabel, planStatusVariant } from '../../utils/formatters'
import toast from 'react-hot-toast'

const formatStorageKb = (kb = 0) => formatFileSize((Number(kb) || 0) * 1024)

const isFreeAccessGrant = (t) => !!t?.subscription?.is_free_grant && t?.subscription?.isactive

const BLANK_FORM = { tenant_studio_name: '', tenant_name: '', tenant_email_id: '', tenant_phone_number: '', tenant_studio_address: '', username: '' }

export default function AdminStudios() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('active')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [creating, setCreating] = useState(false)
  const [grantOpen, setGrantOpen] = useState(false)
  const [grantValue, setGrantValue] = useState({ subscription_plan_id: '', expires_at: null })
  const [viewTenant, setViewTenant] = useState(null)
  // One-time reveal of the auto-generated login password for a just-created studio —
  // the super admin no longer sets a password on this form (moved to Settings for
  // account-level password changes), so the backend mints one and we show it once.
  const [generatedCreds, setGeneratedCreds] = useState(null)
  const [copied, setCopied] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', page, status],
    queryFn: () => getTenants({ page, limit: 10, status })
  })
  // Storage-per-studio isn't tracked on the tenant row itself — reuse the
  // same aggregation the Dashboard already computes rather than duplicating it.
  const { data: analyticsData } = useQuery({
    queryKey: ['super-admin-analytics'],
    queryFn: getDashboardAnalytics,
    staleTime: 60_000,
  })

  const items = data?.data?.items || []
  const total = data?.data?.total || 0
  const pages = data?.data?.pages || 1
  const storageByStudio = analyticsData?.data?.storage_summary?.by_studio || []
  const storageByTenantId = Object.fromEntries(storageByStudio.map(s => [s.tenant_id, s]))

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const payload = { ...form }
      if (grantOpen && grantValue?.subscription_plan_id && grantValue?.expires_at) {
        payload.free_access_plan_id = grantValue.subscription_plan_id
        payload.free_access_until = grantValue.expires_at
      }
      const res = await createTenant(payload)
      toast.success('Studio created')
      qc.invalidateQueries(['tenants'])
      setCreateOpen(false)
      setForm(BLANK_FORM)
      setGrantOpen(false)
      setGrantValue({ subscription_plan_id: '', expires_at: null })
      const generatedPassword = res?.data?.generated_password
      if (generatedPassword) {
        setGeneratedCreds({ username: form.username, password: generatedPassword })
        setCopied(false)
      }
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to create studio') }
    finally { setCreating(false) }
  }

  const copyCreds = () => {
    if (!generatedCreds) return
    navigator.clipboard.writeText(`Username: ${generatedCreds.username}\nPassword: ${generatedCreds.password}`)
      .then(() => { setCopied(true); toast.success('Copied to clipboard') })
      .catch(() => toast.error('Could not copy — copy manually'))
  }

  const handleArchive = async (tenantId, studioName) => {
    const ok = await confirmDialog({ title: 'Archive studio?', message: `Archive "${studioName}"? The studio's admin will immediately lose access, but nothing is deleted.`, confirmLabel: 'Archive', danger: false })
    if (!ok) return
    try {
      await deleteTenant(tenantId)
      toast.success('Studio archived')
      qc.invalidateQueries(['tenants'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed') }
  }

  const handleRestore = async (tenantId, studioName) => {
    const ok = await confirmDialog({ title: 'Restore studio?', message: `Restore "${studioName}"? The studio's admin will regain access immediately.`, confirmLabel: 'Restore', danger: false })
    if (!ok) return
    try {
      await restoreTenant(tenantId)
      toast.success('Studio restored')
      qc.invalidateQueries(['tenants'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed') }
  }

  const handleHardDelete = async (tenantId, studioName) => {
    const ok = await confirmDialog({ title: 'Delete studio permanently?', message: `Permanently delete "${studioName}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true })
    if (!ok) return
    try {
      await hardDeleteTenant(tenantId)
      toast.success('Studio permanently deleted')
      qc.invalidateQueries(['tenants'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed') }
  }

  const handleDeleteStorage = async (tenantId, studioName) => {
    const ok = await confirmDialog({ title: 'Delete all uploaded files?', message: `Delete ALL uploaded photos/videos for "${studioName}"? This frees up their storage but cannot be undone — the studio and its events stay intact.`, confirmLabel: 'Delete', danger: true })
    if (!ok) return
    try {
      const res = await deleteTenantStorage(tenantId)
      toast.success(res?.message || 'Storage deleted')
      qc.invalidateQueries(['super-admin-analytics'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to delete storage') }
  }

  return (
    <AppLayout
      title="Studios"
      subtitle={`${total} total studios on the platform`}
      actions={<GoldButton onClick={() => setCreateOpen(true)}>+ Add Studio</GoldButton>}
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
                {['Studio', 'Owner', 'Plan', 'Storage', 'Created', 'Status', ''].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-4">
                  {[...Array(5)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}
                </td></tr>
              ) : items.map(t => {
                const storageEntry = storageByTenantId[t.tenant_id]
                return (
                <tr key={t.tenant_id}
                  className="border-b hover:bg-[var(--bg-elevated)] transition-colors group"
                  style={{ borderColor: 'var(--border-subtle)' }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
                        <Building2 size={14} className="text-gold-500" />
                      </div>
                      <div>
                        <button
                          onClick={() => setViewTenant(t)}
                          className="text-sm font-medium hover:text-gold-500 transition-colors text-left"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {t.tenant_studio_name}
                        </button>
                        <p className="text-xs text-[var(--text-tertiary)]">{t.tenant_email_id || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{t.tenant_name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isFreeAccessGrant(t) && <Badge variant="gold">Free Access</Badge>}
                      <Badge variant="gold">{planLabel(t.subscription)}</Badge>
                      {t.subscription && <Badge variant={planStatusVariant(t.subscription.status)}>{t.subscription.status}</Badge>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {storageEntry ? formatStorageKb(storageEntry.stored_kb) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-tertiary)]">{formatDate(t.createdAt)}</td>
                  <td className="px-6 py-4">
                    <Badge variant={t.isactive ? 'success' : 'error'}>{t.isactive ? 'Active' : 'Archived'}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setViewTenant(t)}
                        title="View studio details"
                        className="p-1.5 text-[var(--text-tertiary)] hover:text-gold-500 transition-colors">
                        <Eye size={14} />
                      </button>
                      {storageEntry?.stored_kb > 0 && (
                        <button onClick={() => handleDeleteStorage(t.tenant_id, t.tenant_studio_name)}
                          title="Delete studio's storage/files"
                          className="p-1.5 text-[var(--text-tertiary)] hover:text-orange-400 transition-colors">
                          <HardDriveDownload size={14} />
                        </button>
                      )}
                      {t.isactive ? (
                        <button onClick={() => handleArchive(t.tenant_id, t.tenant_studio_name)}
                          title="Archive studio"
                          className="p-1.5 text-[var(--text-tertiary)] hover:text-amber-400 transition-colors">
                          <Archive size={14} />
                        </button>
                      ) : (
                        <button onClick={() => handleRestore(t.tenant_id, t.tenant_studio_name)}
                          title="Restore studio"
                          className="p-1.5 text-[var(--text-tertiary)] hover:text-green-400 transition-colors">
                          <RotateCcw size={14} />
                        </button>
                      )}
                      <button onClick={() => handleHardDelete(t.tenant_id, t.tenant_studio_name)}
                        title="Permanently delete"
                        className="p-1.5 text-[var(--text-tertiary)] hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
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
          <GoldInput label="Email *" name="tenant_email_id" type="email" value={form.tenant_email_id} onChange={e => update('tenant_email_id', e.target.value)} />
          <GoldInput label="Phone *" name="tenant_phone_number" value={form.tenant_phone_number} onChange={e => update('tenant_phone_number', e.target.value)} />
          <GoldInput label="Studio Address *" name="tenant_studio_address" value={form.tenant_studio_address} onChange={e => update('tenant_studio_address', e.target.value)} />
          <GoldInput label="Username *" name="username" value={form.username} onChange={e => update('username', e.target.value)} />
          <p className="text-xs -mt-2 mb-3" style={{ color: 'var(--text-tertiary)' }}>
            A login password is generated automatically — you'll see it once after the studio is created.
          </p>

          <button
            type="button"
            onClick={() => setGrantOpen(o => !o)}
            className="w-full flex items-center justify-between rounded-xl px-4 py-3 mb-3 transition-colors border"
            style={{
              borderColor: grantOpen ? 'rgba(245,158,11,0.5)' : 'var(--border-default)',
              background: grantOpen ? 'rgba(245,158,11,0.08)' : 'var(--bg-elevated)',
            }}
          >
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Grant free access
            </span>
            <span
              className="w-9 h-5 rounded-full relative transition-colors"
              style={{ background: grantOpen ? '#F59E0B' : 'var(--border-default)' }}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: grantOpen ? 18 : 2 }}
              />
            </span>
          </button>
          {grantOpen && (
            <FreeAccessGrantFields value={grantValue} onChange={setGrantValue} />
          )}
          <div className="flex gap-3 pt-2">
            <GoldButton type="submit" loading={creating} className="flex-1">Create</GoldButton>
            <GoldButton type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</GoldButton>
          </div>
        </form>
      </Modal>

      <Modal open={!!generatedCreds} onClose={() => setGeneratedCreds(null)} title="Studio Login Created">
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Share these credentials with the studio owner. This password won't be shown again — the owner can change it after logging in.
        </p>
        <div className="rounded-xl p-4 mb-4 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)]">Username</span>
            <span className="text-sm font-mono text-[var(--text-primary)]">{generatedCreds?.username}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)]">Password</span>
            <span className="text-sm font-mono text-[var(--text-primary)]">{generatedCreds?.password}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <GoldButton type="button" onClick={copyCreds} className="flex-1">
            {copied ? <><CheckCircle2 size={14} className="inline mr-1.5" />Copied</> : <><Copy size={14} className="inline mr-1.5" />Copy Credentials</>}
          </GoldButton>
          <GoldButton type="button" variant="ghost" onClick={() => setGeneratedCreds(null)}>Done</GoldButton>
        </div>
      </Modal>

      {viewTenant && (
        <StudioDetailModal
          tenantId={viewTenant.tenant_id}
          studioName={viewTenant.tenant_studio_name}
          storageLabel={storageByTenantId[viewTenant.tenant_id] ? formatStorageKb(storageByTenantId[viewTenant.tenant_id].stored_kb) : '—'}
          onClose={() => setViewTenant(null)}
        />
      )}
    </AppLayout>
  )
}
