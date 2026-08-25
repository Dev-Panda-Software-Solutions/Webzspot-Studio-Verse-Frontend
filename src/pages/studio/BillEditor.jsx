import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2, FileText } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import AddItemsButton from '../../components/billing/AddItemsButton'
import { getBillById, updateBill } from '../../api/bills'
import toast from 'react-hot-toast'

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`
const lineTotal = (item) => (Number(item.price) - Number(item.discount_per_unit || 0)) * item.quantity

const STATUS_LABEL = { UNPAID: 'Unpaid', PARTIALLY_PAID: 'Partially Paid', PAID: 'Paid' }
const STATUS_VARIANT = { UNPAID: 'gold', PARTIALLY_PAID: 'info', PAID: 'success' }

export default function BillEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [items, setItems] = useState([])
  const [discountAmount, setDiscountAmount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['bill', id],
    queryFn: () => getBillById(id),
  })
  const bill = data?.data

  useEffect(() => {
    if (bill && !loaded) {
      setItems(bill.items.map(i => ({ ...i })))
      setDiscountAmount(Number(bill.discount_amount || 0))
      setLoaded(true)
    }
  }, [bill, loaded])

  const editable = bill?.status === 'UNPAID'

  const addItem = (item) => setItems(prev => [...prev, item])
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))
  const updateItem = (idx, patch) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))

  const itemsTotal = items.reduce((s, i) => s + lineTotal(i), 0)
  const payable = Math.max(0, itemsTotal - Number(discountAmount || 0))

  const handleSave = async () => {
    if (items.length === 0) { toast.error('A bill must have at least one item'); return }
    setSaving(true)
    try {
      await updateBill(id, { items, discount_amount: discountAmount })
      toast.success('Bill updated')
      qc.invalidateQueries(['bill', id])
      qc.invalidateQueries(['bills'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to update bill') }
    finally { setSaving(false) }
  }

  if (isLoading || !bill) {
    return <AppLayout title="Bill"><p style={{ color: 'var(--text-tertiary)' }}>Loading…</p></AppLayout>
  }

  return (
    <AppLayout
      title={`Bill #${bill.bill_number}`}
      subtitle={`From Quotation #${bill.quotation?.quotation_number ?? '—'} · ${bill.billing_client?.name || ''}`}
      actions={
        <div className="flex gap-2">
          <GoldButton variant="ghost" icon={<ArrowLeft size={14} />} onClick={() => navigate('/studio/billing-data')}>Back</GoldButton>
          <Badge variant={STATUS_VARIANT[bill.status]}>{STATUS_LABEL[bill.status]}</Badge>
        </div>
      }
    >
      {bill.billing_client && (
        <GlassCard hover={false} className="flex items-center gap-3 mb-5">
          <Avatar name={bill.billing_client.name} size="sm" />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{bill.billing_client.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{bill.billing_client.email || bill.billing_client.phone || '—'}</p>
          </div>
        </GlassCard>
      )}

      {!editable && (
        <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--accent-muted)', color: '#F59E0B' }}>
          <FileText size={14} />
          Payments have been recorded against this bill — items and discount are now locked.
        </div>
      )}

      <GlassCard hover={false} className="p-0 overflow-hidden mb-5">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Items</h3>
          {editable && <AddItemsButton onAdd={addItem} />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['Item', 'Price', 'Qty', 'Discount/unit', 'Line Total', ...(editable ? [''] : [])].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
                  <td className="px-6 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{item.name}</td>
                  <td className="px-6 py-3">
                    {editable ? (
                      <input
                        type="number" min="0" step="0.01" value={item.price}
                        onChange={e => updateItem(idx, { price: Number(e.target.value) || 0 })}
                        className="w-24 text-sm rounded-lg px-2 py-1.5 outline-none"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                      />
                    ) : <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{money(item.price)}</span>}
                  </td>
                  <td className="px-6 py-3">
                    {editable ? (
                      <input
                        type="number" min="1" value={item.quantity}
                        onChange={e => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-16 text-sm rounded-lg px-2 py-1.5 outline-none"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                      />
                    ) : <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.quantity}</span>}
                  </td>
                  <td className="px-6 py-3">
                    {editable ? (
                      <input
                        type="number" min="0" step="0.01" value={item.discount_per_unit || 0}
                        onChange={e => updateItem(idx, { discount_per_unit: Number(e.target.value) || 0 })}
                        className="w-24 text-sm rounded-lg px-2 py-1.5 outline-none"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                      />
                    ) : <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{money(item.discount_per_unit)}</span>}
                  </td>
                  <td className="px-6 py-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{money(lineTotal(item))}</td>
                  {editable && (
                    <td className="px-6 py-3">
                      <button onClick={() => removeItem(idx)} className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard hover={false} className="max-w-sm ml-auto">
        <div className="flex items-center justify-between mb-3 text-sm">
          <span style={{ color: 'var(--text-tertiary)' }}>Items Total</span>
          <span style={{ color: 'var(--text-primary)' }}>{money(itemsTotal)}</span>
        </div>
        <div className="flex items-center justify-between mb-4 text-sm gap-3">
          <span style={{ color: 'var(--text-tertiary)' }}>Overall Discount (₹)</span>
          {editable ? (
            <input
              type="number" min="0" step="0.01" value={discountAmount}
              onChange={e => setDiscountAmount(Number(e.target.value) || 0)}
              className="w-28 text-sm rounded-lg px-2 py-1.5 outline-none text-right"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
            />
          ) : <span style={{ color: 'var(--text-primary)' }}>{money(discountAmount)}</span>}
        </div>
        <div className="flex items-center justify-between mb-5 pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Payable Amount</span>
          <span className="text-lg font-bold text-gold-500">{money(payable)}</span>
        </div>
        {editable && (
          <GoldButton loading={saving} onClick={handleSave} className="w-full justify-center">Save Changes</GoldButton>
        )}
      </GlassCard>
    </AppLayout>
  )
}
