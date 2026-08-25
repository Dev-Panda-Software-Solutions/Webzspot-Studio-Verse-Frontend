import React, { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Receipt as ReceiptIcon, Plus, Landmark, Search, Wallet, FileCheck2, CreditCard } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import AppLayout from '../../components/layout/AppLayout'
import GlassCard from '../../components/ui/GlassCard'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import Badge from '../../components/ui/Badge'
import GoldButton from '../../components/ui/GoldButton'
import Avatar from '../../components/ui/Avatar'
import GstModal from '../../components/billing/GstModal'
import CreateQuotationModal from '../../components/billing/CreateQuotationModal'
import { getQuotations } from '../../api/quotations'
import { getBills } from '../../api/bills'
import { getAllPayments } from '../../api/payments'
import { getTenantSettings, updateTenantSettings } from '../../api/tenants'
import { formatDate, timeAgo } from '../../utils/formatters'
import { useShutterNavigate } from '../../context/ShutterContext'
import useAuthStore from '../../stores/authStore'
import toast from 'react-hot-toast'

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const GOLD = '#F59E0B'
const METHOD_LABEL = { CASH: 'Cash', GPAY: 'GPay', CARD: 'Card', BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque' }

const BILL_STATUS_LABEL = { UNPAID: 'Unpaid', PARTIALLY_PAID: 'Partially Paid', PAID: 'Paid' }
const BILL_STATUS_VARIANT = { UNPAID: 'gold', PARTIALLY_PAID: 'info', PAID: 'success' }

const shortMonth = (key) => {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short' })
}

// Last 6 calendar months (oldest -> newest) as "YYYY-MM" keys, so months with
// zero collections still render as a zero-height bar instead of vanishing.
const last6MonthKeys = () => {
  const keys = []
  const d = new Date()
  d.setDate(1)
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1)
    keys.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#18181B', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10,
      color: '#F5F5F7', fontSize: 12, padding: '8px 12px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      <p style={{ color: '#A0A0AB', marginBottom: 4 }}>{label}</p>
      <p style={{ color: GOLD, fontWeight: 600 }}>{money(payload[0].value)}</p>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <GlassCard hover={false} className="flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-muted)' }}>
        <Icon size={18} className="text-gold-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
        <p className="text-xl font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </GlassCard>
  )
}

function RecentActivity({ quotations, bills, payments }) {
  const events = useMemo(() => {
    const items = [
      ...quotations.map(q => ({
        id: `q-${q.quotation_id}`, at: q.createdAt, icon: FileText,
        text: `Quotation #${q.quotation_number} created for ${q.billing_client?.name || 'a client'}`,
        amount: q.payable_amount,
      })),
      ...bills.map(b => ({
        id: `b-${b.bill_id}`, at: b.createdAt, icon: FileCheck2,
        text: `Bill #${b.bill_number} generated for ${b.billing_client?.name || 'a client'}`,
        amount: b.payable_amount,
      })),
      ...payments.map(p => ({
        id: `p-${p.payment_id}`, at: p.createdAt, icon: CreditCard,
        text: `Payment received via ${METHOD_LABEL[p.method] || p.method} against Bill #${p.bill?.bill_number ?? '—'}`,
        amount: p.amount, positive: true,
      })),
    ]
    return items.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8)
  }, [quotations, bills, payments])

  if (events.length === 0) {
    return <p className="py-10 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>No activity yet.</p>
  }

  return (
    <div className="space-y-1">
      {events.map(ev => (
        <div key={ev.id} className="flex items-center gap-3 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-elevated)' }}>
            <ev.icon size={13} className="text-gold-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{ev.text}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(ev.at)}</p>
          </div>
          <span className="text-sm font-semibold flex-shrink-0" style={{ color: ev.positive ? '#34D399' : 'var(--text-secondary)' }}>
            {ev.positive ? '+' : ''}{money(ev.amount)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function BillingDashboard() {
  const qc = useQueryClient()
  const shutterNavigate = useShutterNavigate()
  const { user } = useAuthStore()
  const [tab, setTab] = useState('quotations')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [gstOpen, setGstOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [savingGst, setSavingGst] = useState(false)

  const { data: settingsData } = useQuery({
    queryKey: ['tenant-settings', user?.tenant_id],
    queryFn: () => getTenantSettings(user?.tenant_id),
    enabled: !!user?.tenant_id,
  })
  const settings = settingsData?.data || {}

  const { data, isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => getQuotations({ limit: 100 }),
  })
  const quotations = data?.data?.items || []
  const quotationsTotal = data?.data?.total ?? quotations.length
  const filteredQuotations = quotations.filter(q =>
    (statusFilter === 'all' || q.status === statusFilter) &&
    (!search.trim() ||
      q.billing_client?.name?.toLowerCase().includes(search.toLowerCase()) ||
      String(q.quotation_number).includes(search))
  )

  const { data: billsData, isLoading: billsLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: () => getBills({ limit: 100 }),
  })
  const bills = billsData?.data?.items || []
  const billsTotal = billsData?.data?.total ?? bills.length
  const filteredBills = bills.filter(b =>
    (statusFilter === 'all' || b.status === statusFilter) &&
    (!search.trim() ||
      b.billing_client?.name?.toLowerCase().includes(search.toLowerCase()) ||
      String(b.bill_number).includes(search))
  )

  const { data: paymentsData } = useQuery({
    queryKey: ['payments'],
    queryFn: () => getAllPayments({ limit: 100 }),
  })
  const payments = paymentsData?.data || []

  const totalQuoted = quotations.reduce((s, q) => s + q.payable_amount, 0)
  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0)
  const draftCount = quotations.filter(q => q.status === 'DRAFT').length

  const revenueByMonth = useMemo(() => {
    const buckets = Object.fromEntries(last6MonthKeys().map(k => [k, 0]))
    payments.forEach(p => {
      const d = new Date(p.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key in buckets) buckets[key] += Number(p.amount)
    })
    return Object.entries(buckets).map(([key, amount]) => ({ label: shortMonth(key), amount }))
  }, [payments])

  const statusOptions = tab === 'quotations'
    ? [{ key: 'all', label: 'All' }, { key: 'DRAFT', label: 'Draft' }, { key: 'CONFIRMED', label: 'Confirmed' }]
    : [{ key: 'all', label: 'All' }, { key: 'UNPAID', label: 'Unpaid' }, { key: 'PARTIALLY_PAID', label: 'Partial' }, { key: 'PAID', label: 'Paid' }]

  const handleSaveGst = async (form) => {
    setSavingGst(true)
    try {
      await updateTenantSettings(user.tenant_id, form)
      toast.success('GST details saved')
      qc.invalidateQueries(['tenant-settings'])
      setGstOpen(false)
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to save GST details') }
    finally { setSavingGst(false) }
  }

  return (
    <AppLayout
      title="Billing & Invoicing"
      subtitle="Quotations, bills and payments for your studio"
      actions={
        <div className="flex gap-2">
          <GoldButton variant="outline" icon={<Landmark size={14} />} onClick={() => setGstOpen(true)}>
            {settings.gstin_number ? 'Edit GST' : 'Add GST Number'}
          </GoldButton>
          <GoldButton icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>Create Quotation</GoldButton>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={FileText} label="Total Quotations" value={quotations.length} />
        <StatCard icon={ReceiptIcon} label="Draft Quotations" value={draftCount} />
        <StatCard icon={Landmark} label="Total Quoted Value" value={money(totalQuoted)} />
        <StatCard icon={Wallet} label="Total Collected" value={money(totalCollected)} />
      </div>

      <div className="grid xl:grid-cols-3 gap-5 mb-6">
        <GlassCard hover={false} className="xl:col-span-2">
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Revenue Collected</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>Last 6 months</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={revenueByMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#6B6B76', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B6B76', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(245,158,11,0.06)' }} />
              <Bar dataKey="amount" name="Collected" radius={[4, 4, 0, 0]}>
                {revenueByMonth.map((_, i) => (
                  <Cell key={i} fill={i === revenueByMonth.length - 1 ? GOLD : `rgba(245,158,11,${0.28 + (i / 5) * 0.4})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard hover={false}>
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
          <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>Latest quotations, bills & payments</p>
          <RecentActivity quotations={quotations} bills={bills} payments={payments} />
        </GlassCard>
      </div>

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-elevated)' }}>
            {[
              { key: 'quotations', label: 'Quotations' },
              { key: 'bills', label: 'Bills' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setStatusFilter('all') }}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: tab === key ? 'var(--bg-surface)' : 'transparent',
                  color: tab === key ? '#F59E0B' : 'var(--text-secondary)',
                  boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-elevated)' }}>
            {statusOptions.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: statusFilter === key ? 'var(--bg-surface)' : 'transparent',
                  color: statusFilter === key ? '#F59E0B' : 'var(--text-secondary)',
                  boxShadow: statusFilter === key ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'quotations' ? 'Search by client or quotation #…' : 'Search by client or bill #…'}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl outline-none"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
          />
        </div>
      </div>

      {tab === 'quotations' ? (
        <GlassCard hover={false} className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  {['Quotation #', 'Client', 'Date', 'Items', 'Payable', 'Status'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="p-4">
                    {[...Array(5)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}
                  </td></tr>
                ) : filteredQuotations.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    No quotations yet — create one to get started.
                  </td></tr>
                ) : filteredQuotations.map(q => (
                  <tr
                    key={q.quotation_id}
                    onClick={() => shutterNavigate(`/studio/billing-data/quotations/${q.quotation_id}`)}
                    className="border-b hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>#{q.quotation_number}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Avatar name={q.billing_client?.name || '?'} size="xs" />
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{q.billing_client?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>{formatDate(q.createdAt)}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>{q.items?.length || 0}</td>
                    <td className="px-6 py-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{money(q.payable_amount)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={q.status === 'CONFIRMED' ? 'success' : 'gold'}>{q.status === 'CONFIRMED' ? 'Confirmed' : 'Draft'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {quotationsTotal > quotations.length && (
            <p className="px-6 py-3 text-xs border-t" style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border-default)' }}>
              Showing latest {quotations.length} of {quotationsTotal} quotations — refine your search to find older ones.
            </p>
          )}
        </GlassCard>
      ) : (
        <GlassCard hover={false} className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  {['Bill #', 'Client', 'Payable', 'Paid', 'Balance', 'Status'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {billsLoading ? (
                  <tr><td colSpan={6} className="p-4">
                    {[...Array(5)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}
                  </td></tr>
                ) : filteredBills.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    No bills yet — confirm a quotation to generate one.
                  </td></tr>
                ) : filteredBills.map(b => (
                  <tr
                    key={b.bill_id}
                    onClick={() => shutterNavigate(`/studio/billing-data/bills/${b.bill_id}`)}
                    className="border-b hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>#{b.bill_number}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Avatar name={b.billing_client?.name || '?'} size="xs" />
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{b.billing_client?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{money(b.payable_amount)}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: '#34D399' }}>{money(b.paid_amount)}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: b.balance_due > 0 ? '#F87171' : 'var(--text-tertiary)' }}>{money(b.balance_due)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={BILL_STATUS_VARIANT[b.status]}>{BILL_STATUS_LABEL[b.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {billsTotal > bills.length && (
            <p className="px-6 py-3 text-xs border-t" style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border-default)' }}>
              Showing latest {bills.length} of {billsTotal} bills — refine your search to find older ones.
            </p>
          )}
        </GlassCard>
      )}

      <GstModal open={gstOpen} onClose={() => setGstOpen(false)} settings={settings} onSave={handleSaveGst} saving={savingGst} />
      <CreateQuotationModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppLayout>
  )
}
