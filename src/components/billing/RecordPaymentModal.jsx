import React, { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import GoldButton from '../ui/GoldButton'
import { createPayment } from '../../api/payments'
import toast from 'react-hot-toast'

const METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'GPAY', label: 'GPay' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
]

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

// Recording a payment IS generating a receipt — full or split/partial
// payments against the same bill are just multiple calls to this modal.
export default function RecordPaymentModal({ open, bill, onClose, onRecorded }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('CASH')
  const [remark, setRemark] = useState('')
  const [saving, setSaving] = useState(false)

  const balanceDue = Number(bill?.balance_due || 0)

  useEffect(() => {
    if (open) {
      setAmount(balanceDue > 0 ? String(balanceDue) : '')
      setMethod('CASH')
      setRemark('')
    }
  }, [open, balanceDue])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const amt = Number(amount)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
    if (amt > balanceDue + 0.01) { toast.error(`Amount exceeds the remaining balance of ${money(balanceDue)}`); return }
    setSaving(true)
    try {
      await createPayment({ bill_id: bill.bill_id, amount: amt, method, remark: remark.trim() || undefined })
      toast.success('Payment recorded — receipt generated')
      onRecorded?.()
      onClose()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to record payment') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Payment">
      <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
        Remaining balance: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{money(balanceDue)}</span>
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Amount *</label>
          <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
            <span className="px-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>₹</span>
            <input
              type="number" min="0" step="0.01" max={balanceDue}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 text-sm py-2.5 pr-3 outline-none bg-transparent"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Payment Method *</label>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className="px-2 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: method === m.value ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                  color: method === m.value ? '#F59E0B' : 'var(--text-secondary)',
                  border: `1px solid ${method === m.value ? 'rgba(245,158,11,0.4)' : 'var(--border-default)'}`,
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Remark (optional)</label>
          <textarea
            value={remark}
            onChange={e => setRemark(e.target.value)}
            rows={2}
            placeholder="e.g. Advance towards wedding coverage"
            className="w-full text-sm rounded-xl px-3 py-2.5 outline-none resize-none"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
          />
        </div>

        <div className="flex gap-3">
          <GoldButton type="submit" loading={saving} className="flex-1 justify-center">Record Payment</GoldButton>
          <GoldButton type="button" variant="ghost" onClick={onClose}>Cancel</GoldButton>
        </div>
      </form>
    </Modal>
  )
}
