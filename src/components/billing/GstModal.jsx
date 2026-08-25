import React, { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import GoldButton from '../ui/GoldButton'
import GoldInput from '../ui/GoldInput'
import { INDIAN_STATES } from '../../utils/indianStates'

// GSTIN/state are display-only fields printed on Quotation/Bill documents —
// no tax amount is calculated from them.
export default function GstModal({ open, onClose, settings, onSave, saving }) {
  const [form, setForm] = useState({ gstin_number: '', gst_state: '' })

  useEffect(() => {
    if (open) {
      setForm({ gstin_number: settings?.gstin_number || '', gst_state: settings?.gst_state || '' })
    }
  }, [open, settings])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <Modal open={open} onClose={onClose} title="Add GST Number">
      <form onSubmit={handleSubmit}>
        <GoldInput
          label="GSTIN Number *"
          name="gstin_number"
          value={form.gstin_number}
          onChange={e => setForm(f => ({ ...f, gstin_number: e.target.value.toUpperCase() }))}
        />
        <div className="mb-4">
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>State *</label>
          <select
            value={form.gst_state}
            onChange={e => setForm(f => ({ ...f, gst_state: e.target.value }))}
            className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
          >
            <option value="">Select State</option>
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <GoldButton type="submit" loading={saving} disabled={!form.gstin_number.trim() || !form.gst_state} className="flex-1 justify-center">
            Save
          </GoldButton>
          <GoldButton type="button" variant="ghost" onClick={onClose}>Cancel</GoldButton>
        </div>
      </form>
    </Modal>
  )
}
