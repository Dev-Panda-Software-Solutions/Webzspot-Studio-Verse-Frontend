import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Receipt, Plus, Download } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import RecordPaymentModal from '../../components/billing/RecordPaymentModal'
import BillingStatusTracker from '../../components/billing/BillingStatusTracker'
import { getBillById } from '../../api/bills'
import { formatDate } from '../../utils/formatters'
import { openBillingPdf } from '../../utils/downloadPdf'

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const lineTotal = (item) => (Number(item.price) - Number(item.discount_per_unit || 0)) * item.quantity

const STATUS_LABEL = { UNPAID: 'Unpaid', PARTIALLY_PAID: 'Partially Paid', PAID: 'Paid' }
const STATUS_VARIANT = { UNPAID: 'gold', PARTIALLY_PAID: 'info', PAID: 'success' }
const METHOD_LABEL = { CASH: 'Cash', GPAY: 'GPay', CARD: 'Card', BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque' }

// A Bill is a fixed document from the moment a Quotation is confirmed into
// one - items and discount are never editable, matching how a real invoice
// works. The only thing that can happen to a Bill afterwards is recording
// payments against it.
export default function BillEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [paymentOpen, setPaymentOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['bill', id],
    queryFn: () => getBillById(id),
  })
  const bill = data?.data

  if (isLoading || !bill) {
    return <AppLayout title="Bill"><p style={{ color: 'var(--text-tertiary)' }}>Loading…</p></AppLayout>
  }

  const itemsTotal = (bill.items || []).reduce((s, i) => s + lineTotal(i), 0)

  return (
    <AppLayout
      title={`Bill #${bill.bill_number}`}
      subtitle={`From Quotation #${bill.quotation?.quotation_number ?? '-'} · ${bill.client?.user_name || ''}`}
      actions={
        <div className="flex gap-2">
          <GoldButton variant="ghost" icon={<ArrowLeft size={14} />} onClick={() => navigate('/studio/billing-data')}>Back</GoldButton>
          <GoldButton variant="outline" icon={<Download size={14} />} onClick={() => openBillingPdf(`/bills/${id}/pdf`)}>PDF</GoldButton>
          <Badge variant={STATUS_VARIANT[bill.status]}>{STATUS_LABEL[bill.status]}</Badge>
        </div>
      }
    >
      {bill.client && (
        <GlassCard hover={false} className="flex items-center gap-3 mb-5">
          <Avatar name={bill.client.user_name} size="sm" />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{bill.client.user_name}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{bill.client.user_email_id || bill.client.user_phone_number || '-'}</p>
          </div>
        </GlassCard>
      )}

      <BillingStatusTracker bill={bill} />

      <GlassCard hover={false} className="p-0 overflow-hidden mb-5">
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Items</h3>
        </div>

        <div className="hidden overflow-x-auto xl:block">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['Item', 'Price', 'Qty', 'Discount/unit', 'Line Total'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(bill.items || []).map((item) => (
                <tr key={item.bill_item_id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
                  <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{item.name}</td>
                  <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{money(item.price)}</td>
                  <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.quantity}</td>
                  <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{money(item.discount_per_unit)}</td>
                  <td className="px-6 py-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{money(lineTotal(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: item details stay readable without a wide table. */}
        <div className="divide-y xl:hidden" style={{ borderColor: 'var(--border-subtle)' }}>
          {(bill.items || []).map((item) => (
            <div key={item.bill_item_id} className="p-4">
              <p className="text-sm font-medium break-words" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Price</span>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{money(item.price)}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Qty</span>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{item.quantity}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Discount/unit</span>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{money(item.discount_per_unit)}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Line total</span>
                  <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{money(lineTotal(item))}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="flex flex-col sm:flex-row gap-5 items-start">
        <GlassCard hover={false} className="w-full sm:max-w-sm">
          <div className="flex items-center justify-between mb-3 text-sm">
            <span style={{ color: 'var(--text-tertiary)' }}>Items Total</span>
            <span style={{ color: 'var(--text-primary)' }}>{money(itemsTotal)}</span>
          </div>
          <div className="flex items-center justify-between mb-4 text-sm">
            <span style={{ color: 'var(--text-tertiary)' }}>Overall Discount</span>
            <span style={{ color: 'var(--text-primary)' }}>{money(bill.discount_amount)}</span>
          </div>
          <div className="flex items-center justify-between mb-3 pt-3 border-t text-sm" style={{ borderColor: 'var(--border-default)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Payable Amount</span>
            <span className="text-lg font-bold text-gold-500">{money(bill.payable_amount)}</span>
          </div>
          <div className="flex items-center justify-between mb-1 text-sm">
            <span style={{ color: 'var(--text-tertiary)' }}>Paid</span>
            <span style={{ color: '#34D399' }}>{money(bill.paid_amount)}</span>
          </div>
          <div className="flex items-center justify-between mb-5 text-sm">
            <span style={{ color: 'var(--text-tertiary)' }}>Balance Due</span>
            <span className="font-semibold" style={{ color: bill.balance_due > 0 ? '#F87171' : 'var(--text-primary)' }}>{money(bill.balance_due)}</span>
          </div>
          {bill.status !== 'PAID' && (
            <GoldButton icon={<Plus size={14} />} onClick={() => setPaymentOpen(true)} className="w-full justify-center">
              Record Payment
            </GoldButton>
          )}
        </GlassCard>

        {bill.payments?.length > 0 && (
          <GlassCard hover={false} className="w-full flex-1 p-0 overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <Receipt size={15} className="text-gold-500" />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Payments & Receipts</h3>
            </div>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    {['Receipt #', 'Date', 'Amount', 'Method', 'Remark', ''].map(h => (
                      <th key={h} className="px-6 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bill.payments.map(p => (
                    <tr key={p.payment_id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
                      <td className="px-6 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>#{p.receipt_number}</td>
                      <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>{formatDate(p.createdAt)}</td>
                      <td className="px-6 py-3 text-sm font-semibold" style={{ color: '#34D399' }}>{money(p.amount)}</td>
                      <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{METHOD_LABEL[p.method]}</td>
                      <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>{p.remark || '-'}</td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => openBillingPdf(`/payments/${p.payment_id}/pdf`)}
                          title="Download receipt"
                          className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-gold-500 transition-colors"
                        >
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: receipts as compact cards with the download action visible. */}
            <div className="divide-y xl:hidden" style={{ borderColor: 'var(--border-subtle)' }}>
              {bill.payments.map(p => (
                <div key={p.payment_id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>#{p.receipt_number}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{formatDate(p.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold" style={{ color: '#34D399' }}>{money(p.amount)}</span>
                      <button
                        onClick={() => openBillingPdf(`/payments/${p.payment_id}/pdf`)}
                        title="Download receipt"
                        className="p-1.5 rounded text-[var(--text-tertiary)]"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span style={{ color: 'var(--text-secondary)' }}>{METHOD_LABEL[p.method]}</span>
                    <span className="truncate text-right" style={{ color: 'var(--text-tertiary)' }}>{p.remark || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>

      <RecordPaymentModal
        open={paymentOpen}
        bill={bill}
        onClose={() => setPaymentOpen(false)}
        onRecorded={() => {
          qc.invalidateQueries(['bill', id])
          qc.invalidateQueries(['bills'])
          qc.invalidateQueries(['quotation', bill.quotation?.quotation_id])
          qc.invalidateQueries(['quotations'])
        }}
      />
    </AppLayout>
  )
}
