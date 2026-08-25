import React, { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, PackagePlus } from 'lucide-react'
import Modal from '../ui/Modal'
import GoldButton from '../ui/GoldButton'
import { getStudioServices } from '../../api/studioServices'

// "Add Items" — a small dropdown of the studio's saved service catalog with
// quick-add buttons, plus "+ Create Package" for a one-off custom line item
// not in the catalog (name + optional price + optional discount).
export default function AddItemsButton({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState({ name: '', price: '', discount: '' })
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

  const handleCustomSubmit = (e) => {
    e.preventDefault()
    if (!custom.name.trim()) return
    onAdd({
      name: custom.name.trim(),
      price: Number(custom.price) || 0,
      quantity: 1,
      discount_per_unit: Number(custom.discount) || 0,
    })
    setCustomOpen(false)
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
            <GoldButton type="submit" className="flex-1 justify-center">Submit</GoldButton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
