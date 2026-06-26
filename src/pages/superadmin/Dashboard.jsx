import React, { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useQuery } from '@tanstack/react-query'
import { Building2, Users, CalendarDays, ImageIcon, Lock, KeyRound, HardDrive } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/layout/PageHeader'
import StatCard from '../../components/ui/StatCard'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import GoldInput from '../../components/ui/GoldInput'
import PasswordStrength from '../../components/ui/PasswordStrength'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import Badge from '../../components/ui/Badge'
import { getTenants, unlockAccount, resetPassword } from '../../api/tenants'
import { getUsers } from '../../api/users'
import { getDashboardAnalytics } from '../../api/events'
import { formatDate } from '../../utils/formatters'
import toast from 'react-hot-toast'

/* ── Shared chart theme ─────────────────────────────────────── */
const GOLD = '#F59E0B'
const GOLD2 = '#FDE68A'

const tooltipStyle = {
  contentStyle: {
    background: '#18181B',
    border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: 10,
    color: '#F5F5F7',
    fontSize: 12,
    padding: '8px 12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  itemStyle: { color: GOLD },
  labelStyle: { color: '#A0A0AB', marginBottom: 4 },
}

const axisProps = {
  tick: { fill: '#6B6B76', fontSize: 11 },
  axisLine: false,
  tickLine: false,
}

const shortMonth = (key) => {
  if (!key) return ''
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short' })
}

function ChartTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle.contentStyle}>
      <p style={tooltipStyle.labelStyle}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || GOLD, fontWeight: 600 }}>
          {p.value}{suffix} <span style={{ color: '#A0A0AB', fontWeight: 400 }}>{p.name}</span>
        </p>
      ))}
    </div>
  )
}

function StorageTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle.contentStyle}>
      <p style={tooltipStyle.labelStyle}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || GOLD, fontWeight: 600 }}>
          {formatStorage(p.value)} <span style={{ color: '#A0A0AB', fontWeight: 400 }}>{p.name}</span>
        </p>
      ))}
    </div>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>}
    </div>
  )
}

const formatStorage = (kb = 0) => {
  const value = Number(kb) || 0
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} GB`
  if (value >= 1024) return `${(value / 1024).toFixed(2)} MB`
  return `${value.toFixed(1)} KB`
}

function StorageRow({ name, meta, value, max }) {
  const pct = max > 0 ? Math.max(4, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
          {meta && <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{meta}</p>}
        </div>
        <p className="text-xs font-semibold whitespace-nowrap" style={{ color: GOLD }}>{formatStorage(value)}</p>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: GOLD }} />
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const containerRef = useRef(null)
  const [unlockUsername, setUnlockUsername] = useState('')
  const [resetForm, setResetForm] = useState({ username: '', new_password: '' })
  const [unlocking, setUnlocking] = useState(false)
  const [resetting, setResetting] = useState(false)

  const { data: tenantRes, isLoading: tLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => getTenants({ page: 1, limit: 6 })
  })
  const { data: userRes } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => getUsers({ page: 1, limit: 5 })
  })
  const { data: analyticsData, isLoading: aLoading } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: getDashboardAnalytics,
    staleTime: 60_000,
  })

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.stat-row > *', { y: 28, opacity: 0, stagger: 0.09, duration: 0.55, delay: 0.1, ease: 'power3.out' })
      gsap.from('.chart-section', { y: 24, opacity: 0, stagger: 0.1, duration: 0.5, delay: 0.45, ease: 'power3.out' })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  const tenants = tenantRes?.data?.items || []
  const totalTenants = tenantRes?.data?.total || 0
  const totalUsers = userRes?.data?.total || 0
  const analytics = analyticsData?.data || {}
  const totals = analytics.totals || {}
  const storage = analytics.storage_summary || {}
  const storageByEvent = storage.by_event || []
  const storageByStudio = storage.by_studio || []
  const storageByClient = storage.by_client || []
  const maxStudioStorage = Math.max(...storageByStudio.map(item => item.stored_kb || 0), 0)
  const maxClientStorage = Math.max(...storageByClient.map(item => item.assigned_storage_kb || 0), 0)

  const studioGrowth = (analytics.studio_growth || []).map(d => ({ ...d, label: shortMonth(d.month) }))
  const userGrowth = (analytics.user_growth || []).map(d => ({ ...d, label: shortMonth(d.month) }))

  // Merge studio + user growth for combined chart
  const growthChart = studioGrowth.map((d, i) => ({
    label: d.label,
    studios: d.count,
    users: userGrowth[i]?.count || 0,
  }))

  const handleUnlock = async (e) => {
    e.preventDefault()
    if (!unlockUsername.trim()) return
    setUnlocking(true)
    try {
      await unlockAccount({ username: unlockUsername })
      toast.success(`Account "${unlockUsername}" unlocked`)
      setUnlockUsername('')
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to unlock account') }
    finally { setUnlocking(false) }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!resetForm.username || !resetForm.new_password) return
    setResetting(true)
    try {
      await resetPassword(resetForm)
      toast.success('Password reset successfully')
      setResetForm({ username: '', new_password: '' })
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to reset password') }
    finally { setResetting(false) }
  }

  return (
    <AppLayout title="Platform Overview" subtitle="Studios, clients and events at a glance">
      <div ref={containerRef}>

        {/* ── Stat Cards ─── */}
        <div className="stat-row grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Studios" value={totalTenants} icon={Building2} />
          <StatCard label="Total Clients" value={totalUsers} icon={Users} />
          <StatCard label="Events" value={totals.events ?? 0} icon={CalendarDays} />
          <StatCard label="Media Files" value={totals.media ?? 0} icon={ImageIcon}
            sub={<span className="text-xs font-semibold text-gold-500">{formatStorage(storage.total_stored_kb)}</span>} />
        </div>

        {/* ── Growth Chart ─── */}
        <div className="chart-section mb-6">
          <GlassCard hover={false}>
            <SectionHeader title="Platform Growth" subtitle="New studios and clients joined over the last 6 months" />
            {aLoading ? (
              <div className="h-56 skeleton rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={growthChart} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="studioGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="studios" name="studios"
                    stroke={GOLD} strokeWidth={2} fill="url(#studioGrad)"
                    dot={{ fill: GOLD, r: 3, strokeWidth: 0 }}
                    activeDot={{ fill: GOLD2, r: 5, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="users" name="clients"
                    stroke="#60A5FA" strokeWidth={2} fill="url(#userGrad)"
                    dot={{ fill: '#60A5FA', r: 3, strokeWidth: 0 }}
                    activeDot={{ fill: '#93C5FD', r: 5, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {/* Legend */}
            <div className="flex gap-5 mt-3 pl-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded" style={{ background: GOLD }} />
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Studios</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded" style={{ background: '#60A5FA' }} />
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Clients</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* ── Storage Analytics ─── */}
        <div className="chart-section grid xl:grid-cols-3 gap-6 mb-6">
          <GlassCard hover={false} className="xl:col-span-2">
            <SectionHeader title="Storage by Event" subtitle="Original files plus compressed delivery copies" />
            {aLoading ? (
              <div className="h-64 skeleton rounded-lg" />
            ) : storageByEvent.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                No uploaded media yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={storageByEvent.slice(0, 8)} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="event_name" {...axisProps} tickFormatter={(v) => String(v).slice(0, 12)} />
                  <YAxis {...axisProps} tickFormatter={formatStorage} />
                  <Tooltip content={<StorageTooltip />} />
                  <Bar dataKey="stored_kb" name="stored" radius={[4, 4, 0, 0]}>
                    {storageByEvent.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={i === 0 ? GOLD : `rgba(245,158,11,${0.72 - i * 0.06})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          <GlassCard hover={false}>
            <div className="flex items-center gap-2 mb-5">
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)' }}>
                <HardDrive size={14} className="text-gold-500" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Storage Total</h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Private bucket usage estimate</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Stored</p>
                <p className="font-display text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatStorage(storage.total_stored_kb)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Originals</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatStorage(storage.total_original_kb)}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--bg-elevated)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Compressed</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{formatStorage(storage.total_compressed_kb)}</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* ── Studios + Storage by Studio ─── */}
        <div className="chart-section grid xl:grid-cols-3 gap-6 mb-6">
          {/* Recent Studios */}
          <div className="xl:col-span-2">
            <GlassCard hover={false} className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <div>
                  <h2 className="font-semibold text-[var(--text-primary)]">Recent Studios</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{totalTenants} total registered</p>
                </div>
              </div>

              {tLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(4)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}
                </div>
              ) : tenants.length === 0 ? (
                <div className="py-12 text-center text-[var(--text-tertiary)] text-sm">No studios yet</div>
              ) : (
                <div>
                  {tenants.map((t) => (
                    <div key={t.tenant_id || t.id}
                      className="flex items-center gap-4 px-6 py-4 border-b transition-colors hover:bg-[var(--bg-elevated)]"
                      style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-semibold text-sm"
                        style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
                        {(t.tenant_studio_name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{t.tenant_studio_name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{t.tenant_name}</p>
                      </div>
                      <p className="text-xs hidden md:block" style={{ color: 'var(--text-tertiary)' }}>{formatDate(t.createdAt)}</p>
                      <Badge variant={t.isactive ? 'success' : 'error'}>{t.isactive ? 'Active' : 'Inactive'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Storage by Studio */}
          <GlassCard hover={false}>
            <SectionHeader title="Storage by Studio" subtitle="Top studios by stored media" />
            {storageByStudio.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No storage yet</p>
            ) : storageByStudio.slice(0, 5).map(item => (
              <StorageRow
                key={item.tenant_id}
                name={item.studio_name}
                meta={`${item.event_count} events · ${item.media_count} files`}
                value={item.stored_kb}
                max={maxStudioStorage}
              />
            ))}
          </GlassCard>
        </div>

        {/* ── Storage by Client + Quick Actions ─── */}
        <div className="chart-section grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Storage by Client */}
          <GlassCard hover={false}>
            <SectionHeader title="Storage by Client" subtitle="Assigned event storage" />
            {storageByClient.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No assigned client storage yet</p>
            ) : storageByClient.slice(0, 5).map(item => (
              <StorageRow
                key={item.user_id}
                name={item.user_name}
                meta={`${item.event_count} events · ${item.media_count} files`}
                value={item.assigned_storage_kb}
                max={maxClientStorage}
              />
            ))}
          </GlassCard>

          {/* Unlock Account */}
          <GlassCard hover={false}>
            <div className="flex items-center gap-2 mb-5">
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)' }}>
                <Lock size={14} className="text-gold-500" />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)]">Unlock Account</h3>
            </div>
            <form onSubmit={handleUnlock} className="space-y-3">
              <GoldInput
                label="Username"
                name="unlock_username"
                value={unlockUsername}
                onChange={(e) => setUnlockUsername(e.target.value)}
              />
              <GoldButton type="submit" loading={unlocking} size="sm" className="w-full justify-center">
                Unlock
              </GoldButton>
            </form>
          </GlassCard>

          {/* Reset Password */}
          <GlassCard hover={false}>
            <div className="flex items-center gap-2 mb-5">
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)' }}>
                <KeyRound size={14} className="text-gold-500" />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)]">Reset Password</h3>
            </div>
            <form onSubmit={handleReset} className="space-y-3">
              <GoldInput
                label="Username"
                name="reset_username"
                value={resetForm.username}
                onChange={(e) => setResetForm(f => ({ ...f, username: e.target.value }))}
              />
              <GoldInput
                label="New Password"
                name="new_password"
                type="password"
                value={resetForm.new_password}
                onChange={(e) => setResetForm(f => ({ ...f, new_password: e.target.value }))}
              />
              <PasswordStrength value={resetForm.new_password} />
              <GoldButton type="submit" loading={resetting} size="sm" className="w-full justify-center">
                Reset
              </GoldButton>
            </form>
          </GlassCard>
        </div>
      </div>
    </AppLayout>
  )
}
