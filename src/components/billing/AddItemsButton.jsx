import React, { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, PackagePlus } from 'lucide-react'
import Modal from '../ui/Modal'
import GoldButton from '../ui/GoldButton'
import { getStudioServices, createStudioService } from '../../api/studioServices'
import toast from 'react-hot-toast'

// "Add Items" — a small dropdown of the studio's saved service catalog with
// quick-add buttons, plus "+ Create Package" for adding a brand-new one. The
// catalog is a single global list shared between here and Studio Profile —
// "Create Package" saves it there too (not just to this one quotation), so
// it shows up as a quick-add option everywhere from then on. Any discount
// entered here is a one-off line-item negotiation, not part of the saved
// catalog entry, so it's applied to the local item only.
export default function AddItemsButton({ onAdd }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState({ name: '', price: '', discount: '' })
  const [savingCustom, setSavingCustom] = useState(false)
  const wrapRef = useRef(null)

  const { data } = useQuery({
    queryKey: ['studio-services'],
    queryFn: () => getStudioServices({ status: 'active' }),
    enabled: open,
  })
  const services = data?.data?.items || []

  useEffect(() => {
    if (!open) return
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const addService = (service) => {
    onAdd({ name: service.name, price: Number(service.price) || 0, quantity: 1, discount_per_unit: 0 })
    setOpen(false)
  }

  const openCustom = () => { setOpen(false); setCustom({ name: '', price: '', discount: '' }); setCustomOpen(true) }

  const handleCustomSubmit = async (e) => {
    e.preventDefault()
    if (!custom.name.trim()) return
    setSavingCustom(true)
    try {
      const payload = { name: custom.name.trim(), price: custom.price === '' ? null : Number(custom.price) }
      const res = await createStudioService(payload)
      qc.invalidateQueries(['studio-services'])
      onAdd({
        name: res.data.name,
        price: Number(res.data.price) || 0,
        quantity: 1,
        discount_per_unit: Number(custom.discount) || 0,
      })
      setCustomOpen(false)
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to save to catalog')
    } finally {
      setSavingCustom(false)
    }
  }

  return (
    <div className="relative inline-block" ref={wrapRef}>
      <GoldButton size="sm" variant="outline" icon={<Plus size={13} />} onClick={() => setOpen(o => !o)}>
        Add Items
      </GoldButton>

      {open && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-xl overflow-hidden z-20 shadow-modal"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          {services.length === 0 ? (
            <p className="text-xs px-4 py-4 text-center" style={{ color: 'var(--text-tertiary)' }}>
              No saved services yet — add some in Studio Profile.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {services.map(s => (
                <div key={s.studio_service_id} className="flex items-center justify-between gap-2 px-4 py-2.5 border-b last:border-b-0"
                  style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {s.price != null ? `₹${Number(s.price).toLocaleString('en-IN')}` : '—'}
                    </p>
                  </div>
                  <GoldButton size="sm" onClick={() => addService(s)}>Add</GoldButton>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={openCustom}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            <PackagePlus size={14} /> Create Package
          </button>
        </div>
      )}

      <Modal open={customOpen} onClose={() => setCustomOpen(false)} title="Add a Product, Service or Package">
        <p className="text-xs mb-4 -mt-1" style={{ color: 'var(--text-tertiary)' }}>
          This is saved to your studio's catalog, so it'll show up as a quick-add option on future quotations too.
        </p>
        <form onSubmit={handleCustomSubmit}>
          <div className="mb-4">
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Product / Service / Package Name *</label>
            <input
              value={custom.name}
              onChange={e => setCustom(f => ({ ...f, name: e.target.value }))}
              placeholder="Wedding Photography, Portrait Session, Premium Pack"
              className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
            />
          </div>
          <div className="mb-4">
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Price (Optional)</label>
            <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
              <span className="px-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>₹</span>
              <input
                type="number" min="0" step="0.01"
                value={custom.price}
                onChange={e => setCustom(f => ({ ...f, price: e.target.value }))}
                className="flex-1 text-sm py-2.5 pr-3 outline-none bg-transparent"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          <div className="mb-5">
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Discount (optional)</label>
            <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
              <span className="px-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>₹</span>
              <input
                type="number" min="0" step="0.01"
                value={custom.discount}
                onChange={e => setCustom(f => ({ ...f, discount: e.target.value }))}
                className="flex-1 text-sm py-2.5 pr-3 outline-none bg-transparent"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <GoldButton type="button" variant="ghost" onClick={() => setCustomOpen(false)}>Close</GoldButton>
            <GoldButton type="submit" loading={savingCustom} className="flex-1 justify-center">Submit</GoldButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
