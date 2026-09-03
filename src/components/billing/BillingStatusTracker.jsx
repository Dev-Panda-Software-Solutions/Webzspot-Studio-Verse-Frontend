import React from 'react'
import { Check, CheckCircle2, CreditCard } from 'lucide-react'
import GlassCard from '../ui/GlassCard'

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const PAYMENT_STEP = {
  UNPAID: { label: 'Payment Pending', tone: 'danger' },
  PARTIALLY_PAID: { label: 'Payment Partially Completed', tone: 'danger' },
  PAID: { label: 'Payment Completed', tone: 'success' },
}

function Step({ icon, label, active, complete, tone = 'success' }) {
  const toneColor = tone === 'success' ? '#16A34A' : '#DC2626'
  const color = complete || active ? toneColor : 'var(--border-strong)'
  const labelColor = complete || active ? toneColor : 'var(--text-tertiary)'
  const bg = complete || active ? toneColor : 'var(--bg-surface)'

  return (
    <div className="relative z-10 flex min-w-[120px] flex-1 flex-col items-center text-center">
      <div
        className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border-2"
        style={{
          background: bg,
          borderColor: color,
          color: active || complete ? '#FFFFFF' : color,
        }}
      >
        {icon}
      </div>
      <span className="text-[11px] font-bold uppercase leading-tight" style={{ color: labelColor }}>
        {label}
      </span>
    </div>
  )
}

export default function BillingStatusTracker({ bill, quotationCreated = true, className = '' }) {
  const hasBill = !!bill
  const payment = hasBill ? PAYMENT_STEP[bill.status] || PAYMENT_STEP.UNPAID : PAYMENT_STEP.UNPAID
  const paidAmount = Number(bill?.paid_amount || 0)
  const balanceDue = Number(bill?.balance_due || 0)

  return (
    <GlassCard hover={false} className={`mb-5 overflow-hidden p-0 ${className}`}>
      {hasBill && balanceDue > 0 && (
        <div
          className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.18)' }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Amount Due</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Pending amount to be collected
            </p>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#DC2626' }}>{money(balanceDue)}</p>
        </div>
      )}

      {hasBill && (
        <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:flex sm:items-center" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="min-w-[120px]">
            <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Total Paid</p>
            <p className="text-sm font-bold" style={{ color: '#059669' }}>{money(paidAmount)}</p>
          </div>
          <div className="min-w-[120px] sm:border-l sm:pl-4" style={{ borderColor: 'var(--border-default)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Receipts</p>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{bill.receipt_count || 0}</p>
          </div>
          <div className="col-span-2 sm:ml-auto">
            <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Balance Due</p>
            <p className="text-sm font-bold" style={{ color: balanceDue > 0 ? '#DC2626' : '#059669' }}>{money(balanceDue)}</p>
          </div>
        </div>
      )}

      <div className="px-5 py-6">
        <div className="relative flex items-start justify-between gap-3">
          <div className="absolute left-[16%] right-1/2 top-[17px] h-0.5" style={{ background: hasBill ? '#16A34A' : 'var(--border-default)' }} />
          <div
            className="absolute left-1/2 right-[16%] top-[17px] h-0.5"
            style={{ background: hasBill ? (bill.status === 'PAID' ? '#16A34A' : '#FCA5A5') : 'var(--border-default)' }}
          />
          <Step
            icon={<Check size={17} />}
            label="Quotation Created"
            active={quotationCreated}
            complete={quotationCreated}
          />
          <Step
            icon={<CheckCircle2 size={15} />}
            label="Bill Generated"
            active={hasBill}
            complete={hasBill}
          />
          <Step
            icon={payment.tone === 'success' ? <Check size={16} /> : <CreditCard size={15} />}
            label={hasBill ? payment.label : 'Payment Pending'}
            active={hasBill}
            complete={hasBill && bill.status === 'PAID'}
            tone={hasBill ? payment.tone : 'danger'}
          />
        </div>
      </div>
    </GlassCard>
  )
}
