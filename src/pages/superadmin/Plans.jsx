import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import GoldInput from '../../components/ui/GoldInput'
import { getPlans, createPlan, updatePlan, deletePlan, reorderPlans } from '../../api/plans'
import toast from 'react-hot-toast'

const emptyForm = {
  plan_name: '', plan_type: 'SUBSCRIPTION', duration_value: '', duration_unit: 'MONTHS',
  photo_quota: '', price: '', wallet_credits: '', ai_credit_cost_per_photo: '', price_lock_window_days: '0'
}

export default function Plans() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => getPlans({ page: 1, limit: 100 })
  })

  const items = data?.data?.items || []

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (plan) => {
    setEditingId(plan.subscription_plan_id)
    setForm({
      plan_name: plan.plan_name,
      plan_type: plan.plan_type,
      duration_value: plan.duration_value || '',
      duration_unit: plan.duration_unit || 'MONTHS',
      photo_quota: plan.photo_quota || '',
      price: plan.price,
      wallet_credits: plan.wallet_credits || '',
      ai_credit_cost_per_photo: plan.ai_credit_cost_per_photo || '',
      price_lock_window_days: plan.price_lock_window_days || '0'
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        plan_name: form.plan_name,
        plan_type: form.plan_type,
        price: Number(form.price),
        price_lock_window_days: Number(form.price_lock_window_days) || 0,
        ...(form.plan_type === 'SUBSCRIPTION'
          ? { duration_value: Number(form.duration_value), duration_unit: form.duration_unit, photo_quota: Number(form.photo_quota) }
          : { wallet_credits: Number(form.wallet_credits), ai_credit_cost_per_photo: Number(form.ai_credit_cost_per_photo) || 0 })
      }
      if (editingId) await updatePlan(editingId, payload)
      else await createPlan(payload)
      toast.success(editingId ? 'Plan updated' : 'Plan created')
      qc.invalidateQueries(['plans'])
      setModalOpen(false)
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to save plan') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this plan?')) return
    try {
      await deletePlan(id)
      toast.success('Plan deleted')
      qc.invalidateQueries(['plans'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed') }
  }

  const move = async (index, direction) => {
    const newItems = [...items]
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= newItems.length) return
    ;[newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]]
    try {
      await reorderPlans(newItems.map(p => p.subscription_plan_id))
      qc.invalidateQueries(['plans'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to reorder') }
  }

  return (
    <AppLayout
      title="Plans"
      subtitle="Manage subscription and wallet plans available to studios"
      actions={<GoldButton onClick={openCreate}>+ Add Plan</GoldButton>}
    >
      <GlassCard hover={false} className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['Order', 'Plan', 'Type', 'Details', 'Price', 'Status', ''].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-4">
                  {[...Array(3)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}
                </td></tr>
              ) : items.map((p, index) => (
                <tr key={p.subscription_plan_id}
                  className="border-b hover:bg-[var(--bg-elevated)] transition-colors group"
                  style={{ borderColor: 'var(--border-subtle)' }}
                  onClick={() => openEdit(p)}>
                  <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => move(index, -1)} disabled={index === 0}
                        className="p-1 text-[var(--text-tertiary)] hover:text-gold-500 disabled:opacity-30 transition-colors">
                        <ArrowUp size={14} />
                      </button>
                      <button onClick={() => move(index, 1)} disabled={index === items.length - 1}
                        className="p-1 text-[var(--text-tertiary)] hover:text-gold-500 disabled:opacity-30 transition-colors">
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
                        <CreditCard size={14} className="text-gold-500" />
                      </div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{p.plan_name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={p.plan_type === 'WALLET' ? 'gold' : 'info'}>{p.plan_type}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {p.plan_type === 'SUBSCRIPTION'
                      ? `${p.photo_quota} photos / ${p.duration_value} ${p.duration_unit?.toLowerCase()}`
                      : `${p.wallet_credits} credits`}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">₹{Number(p.price).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <Badge variant={p.isactive ? 'success' : 'error'}>{p.isactive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDelete(p.subscription_plan_id)}
                        className="p-1.5 text-[var(--text-tertiary)] hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Plan' : 'Create Plan'}>
        <form onSubmit={handleSave}>
          <GoldInput label="Plan Name *" name="plan_name" value={form.plan_name} onChange={e => update('plan_name', e.target.value)} />

          <div className="mb-6">
            <label className="block text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Plan Type *</label>
            <select
              value={form.plan_type}
              onChange={e => update('plan_type', e.target.value)}
              className="w-full bg-transparent border-b-2 pb-2 text-sm text-[var(--text-primary)] focus:outline-none border-[var(--border-default)] focus:border-[var(--accent-primary)]"
            >
              <option value="SUBSCRIPTION">Subscription (Basic / Pro)</option>
              <option value="WALLET">Wallet</option>
            </select>
          </div>

          <GoldInput label="Price (₹) *" name="price" type="number" value={form.price} onChange={e => update('price', e.target.value)} />

          {form.plan_type === 'SUBSCRIPTION' ? (
            <>
              <GoldInput label="Duration Value *" name="duration_value" type="number" value={form.duration_value} onChange={e => update('duration_value', e.target.value)} />
              <div className="mb-6">
                <label className="block text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Duration Unit *</label>
                <select
                  value={form.duration_unit}
                  onChange={e => update('duration_unit', e.target.value)}
                  className="w-full bg-transparent border-b-2 pb-2 text-sm text-[var(--text-primary)] focus:outline-none border-[var(--border-default)] focus:border-[var(--accent-primary)]"
                >
                  <option value="DAYS">Days</option>
                  <option value="MONTHS">Months</option>
                  <option value="YEARS">Years</option>
                </select>
              </div>
              <GoldInput label="Photo Quota *" name="photo_quota" type="number" value={form.photo_quota} onChange={e => update('photo_quota', e.target.value)} />
            </>
          ) : (
            <>
              <GoldInput label="Wallet Credits *" name="wallet_credits" type="number" value={form.wallet_credits} onChange={e => update('wallet_credits', e.target.value)} />
              <GoldInput label="AI Credit Cost / Photo" name="ai_credit_cost_per_photo" type="number" value={form.ai_credit_cost_per_photo} onChange={e => update('ai_credit_cost_per_photo', e.target.value)} />
            </>
          )}

          <GoldInput label="Price Lock Window (days)" name="price_lock_window_days" type="number" value={form.price_lock_window_days} onChange={e => update('price_lock_window_days', e.target.value)} />

          <div className="flex gap-3 pt-2">
            <GoldButton type="submit" loading={saving} className="flex-1">{editingId ? 'Save' : 'Create'}</GoldButton>
            <GoldButton type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</GoldButton>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
