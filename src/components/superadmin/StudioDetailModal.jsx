import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2, Mail, Phone, MapPin, CalendarDays, HardDrive, ImageIcon, Users,
  UploadCloud, Wallet, ShieldCheck, ShieldX, CreditCard, FolderOpen, Gift,
  Pencil, Archive, RotateCcw, Trash2, Ban, HardDriveDownload,
} from 'lucide-react'
import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import GoldButton from '../ui/GoldButton'
import SkeletonLoader from '../ui/SkeletonLoader'
import FreeAccessGrantFields from './FreeAccessGrantFields'
import {
  getTenantById, getTenantSummary, grantFreeAccess, revokeFreeAccess,
  setTenantPlan, deleteTenant, restoreTenant, hardDeleteTenant, deleteTenantStorage,
} from '../../api/tenants'
import { getTenantSubscription, getTenantSubscriptionHistory } from '../../api/billing'
import { getEvents } from '../../api/events'
import { getUsers, deleteUser, restoreUser } from '../../api/users'
import { getPlans } from '../../api/plans'
import { formatDate, planLabel, planStatusVariant } from '../../utils/formatters'
import { confirmDialog } from '../ui/ConfirmDialog'
import toast from 'react-hot-toast'

const isGrantActive = (subscription) => !!subscription?.is_free_grant && !!subscription?.isactive

const changeLabel = (changeType) => {
  switch (changeType) {
    case 'UPGRADE': return { label: 'Upgrade', variant: 'success' }
    case 'DOWNGRADE': return { label: 'Downgrade', variant: 'gold' }
    case 'SUBSCRIBE': return { label: 'Subscribe', variant: 'info' }
    case 'TRIAL': return { label: 'Trial', variant: 'info' }
    case 'FREE_GRANT': return { label: 'Free Grant', variant: 'gold' }
    case 'ADMIN_SET': return { label: 'Admin Set', variant: 'info' }
    default: return null
  }
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: 'var(--bg-elevated)' }}>
        <Icon size={13} className="text-gold-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{value || '—'}</p>
      </div>
    </div>
  )
}

function SectionTitle({ title }) {
  return (
    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
      {title}
    </h3>
  )
}

export default function StudioDetailModal({ tenantId, studioName, storageLabel, onClose }) {
  const qc = useQueryClient()
  const [grantValue, setGrantValue] = useState({ subscription_plan_id: '', expires_at: null })
  const [granting, setGranting] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [planEditOpen, setPlanEditOpen] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [planSaving, setPlanSaving] = useState(false)
  const [studioAction, setStudioAction] = useState(null)
  const [userAction, setUserAction] = useState(null)

  const { data: plansData } = useQuery({
    queryKey: ['plans', 'studio-plan-assign'],
    queryFn: () => getPlans({ page: 1, limit: 100 }),
    enabled: planEditOpen,
    staleTime: 60_000,
  })

  const { data: tenantData } = useQuery({
    queryKey: ['tenant-detail', tenantId],
    queryFn: () => getTenantById(tenantId),
    enabled: !!tenantId,
  })
  const { data: summaryData } = useQuery({
    queryKey: ['tenant-summary', tenantId],
    queryFn: () => getTenantSummary(tenantId),
    enabled: !!tenantId,
  })
  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ['tenant-subscription', tenantId],
    queryFn: () => getTenantSubscription(tenantId),
    enabled: !!tenantId,
  })
  const { data: historyData, isLoading: hLoading } = useQuery({
    queryKey: ['tenant-sub-history', tenantId],
    queryFn: () => getTenantSubscriptionHistory(tenantId),
    enabled: !!tenantId,
  })
  const { data: eventsData, isLoading: eLoading } = useQuery({
    queryKey: ['tenant-events', tenantId],
    queryFn: () => getEvents({ tenant_id: tenantId, limit: 8, status: 'all' }),
    enabled: !!tenantId,
  })
  const { data: usersData, isLoading: uLoading } = useQuery({
    queryKey: ['tenant-users', tenantId],
    queryFn: () => getUsers({ created_by_tenant_id: tenantId, limit: 8, status: 'all' }),
    enabled: !!tenantId,
  })

  const tenant = tenantData?.data || {}
  const summary = summaryData?.data || {}
  const subscription = subData?.data?.subscription || null
  const wallet = subData?.data?.wallet || null
  const history = historyData?.data || []
  const events = eventsData?.data?.items || []
  const users = usersData?.data?.items || []

  const grantActive = isGrantActive(subscription)

  const invalidate = () => {
    qc.invalidateQueries(['tenant-detail'])
    qc.invalidateQueries(['tenant-summary'])
    qc.invalidateQueries(['tenant-subscription'])
    qc.invalidateQueries(['tenant-sub-history'])
    qc.invalidateQueries(['tenant-events'])
    qc.invalidateQueries(['tenant-users'])
    qc.invalidateQueries(['tenants'])
    qc.invalidateQueries(['super-admin-analytics'])
  }

  const handleSetPlan = async () => {
    if (!selectedPlanId) return toast.error('Pick a plan to assign')
    setPlanSaving(true)
    try {
      await setTenantPlan(tenantId, { subscription_plan_id: selectedPlanId })
      toast.success('Plan assigned to studio')
      setPlanEditOpen(false)
      setSelectedPlanId('')
      invalidate()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to assign plan') }
    finally { setPlanSaving(false) }
  }

  const handleArchiveStudio = async () => {
    const ok = await confirmDialog({
      title: 'Revoke studio?',
      message: `Revoke "${studioName}"? The studio's admin immediately loses access — nothing is deleted and it can be restored anytime.`,
      confirmLabel: 'Revoke',
      danger: false,
    })
    if (!ok) return
    setStudioAction('archive')
    try {
      await deleteTenant(tenantId)
      toast.success('Studio revoked')
      invalidate()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to revoke studio') }
    finally { setStudioAction(null) }
  }

  const handleRestoreStudio = async () => {
    const ok = await confirmDialog({
      title: 'Restore studio?',
      message: `Restore "${studioName}"? The studio's admin regains access immediately.`,
      confirmLabel: 'Restore',
      danger: false,
    })
    if (!ok) return
    setStudioAction('restore')
    try {
      await restoreTenant(tenantId)
      toast.success('Studio restored')
      invalidate()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to restore studio') }
    finally { setStudioAction(null) }
  }

  const handleDeleteStorage = async () => {
    const ok = await confirmDialog({
      title: 'Delete all uploaded files?',
      message: `Delete ALL uploaded photos/videos for "${studioName}"? This frees up their storage but cannot be undone — the studio and its events stay intact.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    setStudioAction('storage')
    try {
      const res = await deleteTenantStorage(tenantId)
      toast.success(res?.message || 'Storage deleted')
      invalidate()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to delete storage') }
    finally { setStudioAction(null) }
  }

  const handleHardDeleteStudio = async () => {
    const ok = await confirmDialog({
      title: 'Delete studio permanently?',
      message: `Permanently delete "${studioName}"? This cannot be undone — subscriptions, settings and mappings are wiped (client accounts are kept).`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    setStudioAction('hard-delete')
    try {
      await hardDeleteTenant(tenantId)
      toast.success('Studio permanently deleted')
      invalidate()
      onClose()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to delete studio') }
    finally { setStudioAction(null) }
  }

  const handleRevokeUser = async (u) => {
    const ok = await confirmDialog({
      title: 'Revoke client?',
      message: `Revoke "${u.user_name}"? Their login and event access are immediately disabled, but the account stays on record and can be restored.`,
      confirmLabel: 'Revoke',
      danger: true,
    })
    if (!ok) return
    setUserAction(u.user_id)
    try {
      await deleteUser(u.user_id)
      toast.success('Client revoked')
      invalidate()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to revoke client') }
    finally { setUserAction(null) }
  }

  const handleRestoreUser = async (u) => {
    setUserAction(u.user_id)
    try {
      await restoreUser(u.user_id)
      toast.success('Client restored')
      invalidate()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to restore client') }
    finally { setUserAction(null) }
  }

  const handleGrant = async () => {
    if (!grantValue?.subscription_plan_id || !grantValue?.expires_at) {
      return toast.error('Pick a plan and an expiry date for the free access')
    }
    setGranting(true)
    try {
      await grantFreeAccess(tenantId, {
        subscription_plan_id: grantValue.subscription_plan_id,
        expires_at: grantValue.expires_at,
      })
      toast.success('Free access granted')
      setGrantValue({ subscription_plan_id: '', expires_at: null })
      invalidate()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to grant free access') }
    finally { setGranting(false) }
  }

  const handleRevoke = async () => {
    const ok = await confirmDialog({
      title: 'Revoke free access?',
      message: `Revoke free access for "${studioName}"? The studio immediately returns to its normal state and the granted plan is cancelled.`,
      confirmLabel: 'Revoke',
      danger: true,
    })
    if (!ok) return
    setRevoking(true)
    try {
      await revokeFreeAccess(tenantId)
      toast.success('Free access revoked')
      invalidate()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to revoke free access') }
    finally { setRevoking(false) }
  }

  const quotaLabel = subscription
    ? `${subscription.photo_quota_used ?? 0} / ${subscription.photo_quota_total ?? 0} photos`
    : '—'

  return (
    <Modal open onClose={onClose} title={`${studioName} — Studio Details`} size="2xl">
      <div className="max-h-[75vh] overflow-y-auto pr-1 -mr-1 space-y-6">

        {/* ── Overview ── */}
        <section>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)' }}>
                <Building2 size={18} className="text-gold-500" />
              </div>
              <div>
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{tenant.tenant_studio_name}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{tenant.tenant_email_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {grantActive && <Badge variant="gold">Free Access</Badge>}
              <Badge variant={tenant.isactive ? 'success' : 'error'}>{tenant.isactive ? 'Active' : 'Archived'}</Badge>
            </div>
          </div>

          {/* Studio-level actions */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {tenant.isactive ? (
              <GoldButton size="sm" variant="outline" loading={studioAction === 'archive'} onClick={handleArchiveStudio} icon={<Archive size={13} />}>
                Revoke Studio
              </GoldButton>
            ) : (
              <GoldButton size="sm" variant="outline" loading={studioAction === 'restore'} onClick={handleRestoreStudio} icon={<RotateCcw size={13} />}>
                Restore Studio
              </GoldButton>
            )}
            <GoldButton size="sm" variant="outline" loading={studioAction === 'storage'} onClick={handleDeleteStorage} icon={<HardDriveDownload size={13} />}>
              Delete Storage
            </GoldButton>
            <GoldButton size="sm" variant="danger" loading={studioAction === 'hard-delete'} onClick={handleHardDeleteStudio} icon={<Trash2 size={13} />}>
              Delete Studio
            </GoldButton>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-xl p-4" style={{ background: 'var(--bg-elevated)' }}>
            <DetailRow icon={Building2} label="Owner" value={tenant.tenant_name} />
            <DetailRow icon={Phone} label="Phone" value={tenant.tenant_phone_number} />
            <DetailRow icon={Mail} label="Email" value={tenant.tenant_email_id} />
            <DetailRow icon={MapPin} label="Address" value={tenant.tenant_studio_address} />
            <DetailRow icon={CalendarDays} label="Joined" value={formatDate(tenant.createdAt)} />
            <DetailRow icon={HardDrive} label="Storage Used" value={storageLabel} />
            <DetailRow icon={Users} label="Clients" value={summary.user_count ?? '—'} />
            <DetailRow icon={FolderOpen} label="Events" value={summary.event_count ?? '—'} />
            <DetailRow icon={ImageIcon} label="Media Files" value={summary.media_count ?? '—'} />
            <DetailRow icon={UploadCloud} label="Uploads Pending" value={summary.pending_uploads_count ?? '—'} />
            <DetailRow icon={CreditCard} label="Active Plan" value={planLabel(subscription)} />
            <DetailRow icon={CalendarDays} label="Plan Expires" value={subscription?.expires_at ? formatDate(subscription.expires_at) : '—'} />
          </div>
        </section>

        {/* ── Free Access management ── */}
        <section className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2 mb-3">
            {grantActive
              ? <ShieldCheck size={15} className="text-green-400" />
              : <ShieldX size={15} className="text-[var(--text-tertiary)]" />}
            <SectionTitle title="Free Access" />
          </div>
          {grantActive ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)' }}>
                  <Gift size={15} className="text-gold-500" />
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    <strong>{subscription.plan?.plan_name || 'Plan'}</strong> free until <strong>{formatDate(subscription.expires_at)}</strong>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    Granted {formatDate(subscription.starts_at)} · ₹0 · {subscription.photo_quota_total} photo quota
                  </p>
                </div>
              </div>
              <GoldButton variant="danger" size="sm" loading={revoking} onClick={handleRevoke}>
                Revoke Access
              </GoldButton>
            </div>
          ) : (
            <div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                Grant a studio one of the existing plans for free until a chosen expiry (e.g. 6 or 12 months).
                Revocable anytime.
              </p>
              <FreeAccessGrantFields value={grantValue} onChange={setGrantValue} />
              <GoldButton loading={granting} onClick={handleGrant}>Grant Free Access</GoldButton>
            </div>
          )}
        </section>

        {/* ── Subscription & wallet ── */}
        <section className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Wallet size={15} className="text-gold-500" />
              <SectionTitle title="Subscription & Wallet" />
            </div>
            <GoldButton size="sm" variant="outline" onClick={() => { setSelectedPlanId(subscription?.subscription_plan_id || ''); setPlanEditOpen(true) }} icon={<Pencil size={13} />}>
              Edit Plan
            </GoldButton>
          </div>
          {subLoading ? (
            <SkeletonLoader type="table-row" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg p-3" style={{ background: 'var(--bg-surface)' }}>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Active Plan</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{planLabel(subscription)}</span>
                  {subscription && <Badge variant={planStatusVariant(subscription.status)}>{subscription.status}</Badge>}
                  {grantActive && <Badge variant="gold">Free</Badge>}
                </div>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'var(--bg-surface)' }}>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Photo Quota</p>
                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{quotaLabel}</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'var(--bg-surface)' }}>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Expires</p>
                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                  {subscription?.expires_at ? formatDate(subscription.expires_at) : '—'}
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'var(--bg-surface)' }}>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Wallet Balance</p>
                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                  {wallet ? `${wallet.balance_credits} credits` : 'No wallet'}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ── Payment history ── */}
        <section>
          <SectionTitle title="Payment History" />
          {hLoading ? (
            <SkeletonLoader type="table-row" />
          ) : history.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No subscription purchases yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-subtle)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    {['Change', 'Plan', 'Price', 'Starts', 'Expires', 'Status'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(s => {
                    const change = changeLabel(s.change_type)
                    return (
                    <tr key={s.tenant_subscription_id} className="border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
                      <td className="px-4 py-2.5">
                        {change ? <Badge variant={change.variant}>{change.label}</Badge> : '—'}
                      </td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {s.plan?.plan_name || (s.status === 'TRIAL' ? 'Free Trial' : '—')}
                        {s.is_free_grant && <span className="ml-1.5 text-[10px] text-gold-500 font-semibold">FREE</span>}
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                        {s.locked_price != null ? `₹${Number(s.locked_price).toLocaleString('en-IN')}` : (s.plan ? `₹${Number(s.plan.price).toLocaleString('en-IN')}` : '—')}
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>{formatDate(s.starts_at)}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>{s.expires_at ? formatDate(s.expires_at) : '—'}</td>
                      <td className="px-4 py-2.5"><Badge variant={planStatusVariant(s.status)}>{s.status}</Badge></td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Clients ── */}
        <section>
          <SectionTitle title={`Clients (${summary.user_count ?? 0})`} />
          {uLoading ? (
            <SkeletonLoader type="table-row" />
          ) : users.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No clients yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-subtle)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    {['Name', 'Email', 'Phone', 'Events', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.user_id} className="border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{u.user_name}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>{u.user_email_id || '—'}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>{u.user_phone_number || '—'}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>{(u.event_names || []).join(', ') || '—'}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={u.isactive ? 'success' : 'error'}>{u.isactive ? 'Active' : 'Revoked'}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        {u.isactive ? (
                          <button
                            onClick={() => handleRevokeUser(u)}
                            disabled={userAction === u.user_id}
                            title="Revoke client access"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                            style={{ color: '#F87171', background: 'rgba(239,68,68,0.1)' }}
                          >
                            <Ban size={12} />
                            {userAction === u.user_id ? 'Revoking…' : 'Revoke'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestoreUser(u)}
                            disabled={userAction === u.user_id}
                            title="Restore client access"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                            style={{ color: '#4ADE80', background: 'rgba(34,197,94,0.1)' }}
                          >
                            <RotateCcw size={12} />
                            {userAction === u.user_id ? 'Restoring…' : 'Restore'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Events ── */}
        <section>
          <SectionTitle title={`Events (${summary.event_count ?? 0})`} />
          {eLoading ? (
            <SkeletonLoader type="table-row" />
          ) : events.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No events yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-subtle)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    {['Event', 'Date', 'Status'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map(ev => (
                    <tr key={ev.event_id} className="border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{ev.event_name}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>{ev.event_date ? formatDate(ev.event_date) : '—'}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={ev.isactive ? 'success' : 'error'}>{ev.isactive ? 'Active' : 'Archived'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ── Assign plan picker ── */}
      <Modal open={planEditOpen} onClose={() => setPlanEditOpen(false)} title={`Edit Plan — ${studioName}`}>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Assign a new subscription plan to this studio. The current plan is replaced with a
          fresh billing period starting today — the studio's used photo quota carries over.
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 mb-5">
          {(plansData?.data?.items || [])
            .filter(p => p.plan_type === 'SUBSCRIPTION')
            .map(p => (
              <button
                key={p.subscription_plan_id}
                type="button"
                onClick={() => setSelectedPlanId(p.subscription_plan_id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all text-left"
                style={{
                  borderColor: selectedPlanId === p.subscription_plan_id ? 'rgba(245,158,11,0.6)' : 'var(--border-default)',
                  background: selectedPlanId === p.subscription_plan_id ? 'rgba(245,158,11,0.1)' : 'var(--bg-elevated)',
                }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.plan_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {p.photo_quota} photos · {p.duration_value} {p.duration_unit?.toLowerCase()}
                    {p.includes_ai_media ? ' · AI Media' : ''}
                  </p>
                </div>
                <p className="text-sm font-semibold whitespace-nowrap" style={{ color: '#F59E0B' }}>
                  ₹{Number(p.price).toLocaleString('en-IN')}
                </p>
              </button>
            ))}
        </div>
        <div className="flex gap-3">
          <GoldButton onClick={handleSetPlan} loading={planSaving} disabled={!selectedPlanId} className="flex-1">
            Assign Plan
          </GoldButton>
          <GoldButton variant="ghost" onClick={() => setPlanEditOpen(false)}>Cancel</GoldButton>
        </div>
      </Modal>
    </Modal>
  )
}
