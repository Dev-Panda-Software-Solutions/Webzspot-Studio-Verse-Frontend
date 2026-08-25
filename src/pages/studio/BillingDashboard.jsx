import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Receipt as ReceiptIcon, Plus, Landmark, Search } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import GlassCard from '../../components/ui/GlassCard'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import Badge from '../../components/ui/Badge'
import GoldButton from '../../components/ui/GoldButton'
import Avatar from '../../components/ui/Avatar'
import GstModal from '../../components/billing/GstModal'
import CreateQuotationModal from '../../components/billing/CreateQuotationModal'
import { getQuotations } from '../../api/quotations'
import { getTenantSettings, updateTenantSettings } from '../../api/tenants'
import { formatDate } from '../../utils/formatters'
import { useShutterNavigate } from '../../context/ShutterContext'
import useAuthStore from '../../stores/authStore'
import toast from 'react-hot-toast'

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

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

export default function BillingDashboard() {
  const qc = useQueryClient()
  const shutterNavigate = useShutterNavigate()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
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
    queryFn: () => getQuotations({ limit: 50 }),
  })
  const quotations = data?.data?.items || []
  const filtered = quotations.filter(q =>
    !search.trim() ||
    q.billing_client?.name?.toLowerCase().includes(search.toLowerCase()) ||
    String(q.quotation_number).includes(search)
  )

  const totalQuoted = quotations.reduce((s, q) => s + q.payable_amount, 0)
  const draftCount = quotations.filter(q => q.status === 'DRAFT').length

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={FileText} label="Total Quotations" value={quotations.length} />
        <StatCard icon={ReceiptIcon} label="Draft Quotations" value={draftCount} />
        <StatCard icon={Landmark} label="Total Quoted Value" value={money(totalQuoted)} />
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by client or quotation #…"
          className="w-full pl-8 pr-3 py-2 text-sm rounded-xl outline-none"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
        />
      </div>

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
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  No quotations yet — create one to get started.
                </td></tr>
              ) : filtered.map(q => (
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
      </GlassCard>

      <GstModal open={gstOpen} onClose={() => setGstOpen(false)} settings={settings} onSave={handleSaveGst} saving={savingGst} />
      <CreateQuotationModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppLayout>
  )
}
