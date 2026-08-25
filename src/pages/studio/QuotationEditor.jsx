import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2, CheckCircle2, Download } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import AddItemsButton from '../../components/billing/AddItemsButton'
import { confirmDialog } from '../../components/ui/ConfirmDialog'
import { getBillingClients } from '../../api/billingClients'
import { getQuotationById, createQuotation, updateQuotation, deleteQuotation } from '../../api/quotations'
import { confirmQuotationToBill } from '../../api/bills'
import { openBillingPdf } from '../../utils/downloadPdf'
import toast from 'react-hot-toast'

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const lineTotal = (item) => (Number(item.price) - Number(item.discount_per_unit || 0)) * item.quantity

export default function QuotationEditor() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('client')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = !!id

  const [client, setClient] = useState(null)
  const [items, setItems] = useState([])
  const [discountAmount, setDiscountAmount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const { data: existingData, isLoading: loadingExisting } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => getQuotationById(id),
    enabled: isEdit,
  })

  const { data: clientLookup } = useQuery({
    queryKey: ['billing-client-lookup', clientId],
    queryFn: () => getBillingClients({ search: '' }),
    enabled: !isEdit && !!clientId,
  })

  useEffect(() => {
    if (isEdit && existingData?.data && !loaded) {
      const q = existingData.data
      setClient(q.billing_client)
      setItems(q.items.map(i => ({ ...i })))
      setDiscountAmount(Number(q.discount_amount || 0))
      setLoaded(true)
    }
  }, [isEdit, existingData, loaded])

  useEffect(() => {
    if (!isEdit && clientId && clientLookup?.data?.items && !client) {
      const found = clientLookup.data.items.find(c => c.billing_client_id === clientId)
      if (found) setClient(found)
    }
  }, [isEdit, clientId, clientLookup, client])

  const quotation = existingData?.data
  const isConfirmed = quotation?.status === 'CONFIRMED'
  const editable = !isConfirmed

  const addItem = (item) => setItems(prev => [...prev, item])
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))
  const updateItem = (idx, patch) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))

  const itemsTotal = items.reduce((s, i) => s + lineTotal(i), 0)
  const payable = Math.max(0, itemsTotal - Number(discountAmount || 0))

  const handleSave = async () => {
    if (items.length === 0) { toast.error('Add at least one item to the quotation'); return }
    setSaving(true)
    try {
      if (isEdit) {
        await updateQuotation(id, { items, discount_amount: discountAmount })
        toast.success('Quotation updated')
        qc.invalidateQueries(['quotation', id])
        qc.invalidateQueries(['quotations'])
      } else {
        const res = await createQuotation({ billing_client_id: clientId, items })
        toast.success('Quotation created')
        qc.invalidateQueries(['quotations'])
        navigate(`/studio/billing-data/quotations/${res.data.quotation_id}`, { replace: true })
      }
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to save quotation') }
    finally { setSaving(false) }
  }

  const handleConfirm = async () => {
    const ok = await confirmDialog({
      title: 'Confirm this quotation?',
      message: 'A bill will be generated from these items. The quotation can no longer be edited after this.',
      confirmLabel: 'Confirm & Generate Bill',
      danger: false,
    })
    if (!ok) return
    setConfirming(true)
    try {
      const res = await confirmQuotationToBill(id)
      toast.success('Bill generated')
      qc.invalidateQueries(['quotation', id])
      qc.invalidateQueries(['quotations'])
      qc.invalidateQueries(['bills'])
      navigate(`/studio/billing-data/bills/${res.data.bill_id}`)
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to confirm quotation') }
    finally { setConfirming(false) }
  }

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: 'Delete quotation?',
      message: 'This quotation will be archived and removed from your active list. This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteQuotation(id)
      toast.success('Quotation deleted')
      qc.invalidateQueries(['quotations'])
      navigate('/studio/billing-data')
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to delete quotation') }
  }

  if (isEdit && loadingExisting) {
    return <AppLayout title="Quotation"><p style={{ color: 'var(--text-tertiary)' }}>Loading…</p></AppLayout>
  }

  return (
    <AppLayout
      title={isEdit ? `Quotation #${quotation?.quotation_number ?? ''}` : 'New Quotation'}
      subtitle={client ? `For ${client.name}` : 'Add products, services or packages'}
      actions={
        <div className="flex gap-2 items-center">
          <GoldButton variant="ghost" icon={<ArrowLeft size={14} />} onClick={() => navigate('/studio/billing-data')}>Back</GoldButton>
          {isEdit && (
            <GoldButton variant="outline" icon={<Download size={14} />} onClick={() => openBillingPdf(`/quotations/${id}/pdf`)}>PDF</GoldButton>
          )}
          {isConfirmed && <Badge variant="success">Confirmed</Badge>}
          {isEdit && !isConfirmed && <GoldButton variant="danger" icon={<Trash2 size={14} />} onClick={handleDelete}>Delete</GoldButton>}
        </div>
      }
    >
      {client && (
        <GlassCard hover={false} className="flex items-center gap-3 mb-5">
          <Avatar name={client.name} size="sm" />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{client.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{client.email || client.phone || '—'}</p>
          </div>
        </GlassCard>
      )}

      {isConfirmed && quotation?.bill && (
        <div className="flex items-center justify-between gap-3 mb-5 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--accent-muted)', color: '#F59E0B' }}>
          <span>This quotation has been confirmed and is now locked. Edits happen on the generated bill.</span>
          <GoldButton size="sm" onClick={() => navigate(`/studio/billing-data/bills/${quotation.bill.bill_id}`)}>
            View Bill #{quotation.bill.bill_number}
          </GoldButton>
        </div>
      )}

      <GlassCard hover={false} className="p-0 overflow-hidden mb-5">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Items</h3>
          {editable && <AddItemsButton onAdd={addItem} />}
        </div>

        {items.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No items added yet — click "Add Items" to build this quotation.
          </p>
        ) : (
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
        )}
      </GlassCard>

      <GlassCard hover={false} className="max-w-sm ml-auto">
        <div className="flex items-center justify-between mb-3 text-sm">
          <span style={{ color: 'var(--text-tertiary)' }}>Items Total</span>
          <span style={{ color: 'var(--text-primary)' }}>{money(itemsTotal)}</span>
        </div>
        <div className="flex items-center justify-between mb-4 text-sm gap-3">
          <span style={{ color: 'var(--text-tertiary)' }}>Overall Discount (₹)</span>
          <input
            type="number" min="0" step="0.01" value={discountAmount}
            onChange={e => setDiscountAmount(Number(e.target.value) || 0)}
            className="w-28 text-sm rounded-lg px-2 py-1.5 outline-none text-right"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
          />
        </div>
        <div className="flex items-center justify-between mb-5 pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Payable Amount</span>
          <span className="text-lg font-bold text-gold-500">{money(payable)}</span>
        </div>
        <GoldButton loading={saving} onClick={handleSave} className="w-full justify-center">
          {isEdit ? 'Save Changes' : 'Create Quotation'}
        </GoldButton>
      </GlassCard>
    </AppLayout>
  )
}
