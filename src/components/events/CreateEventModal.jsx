import React, { useRef, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UploadCloud, X, Sparkles } from 'lucide-react'
import Modal from '../ui/Modal'
import GoldButton from '../ui/GoldButton'
import GoldInput from '../ui/GoldInput'
import { createEvent, updateEvent } from '../../api/events'
import { uploadCoverImage } from '../../api/media'
import { getMySubscription } from '../../api/billing'
import { backendAssetUrl } from '../../utils/apiUrl'
import toast from 'react-hot-toast'

const EMPTY = {
  event_name: '', event_date: '', event_time: '',
  event_venue: '', event_organizer: '', event_description: '',
  event_organizer_phone_number: '', event_organizer_email_id: '',
  is_ai_event: false
}

function toDateInput(val) {
  if (!val) return ''
  return new Date(val).toISOString().slice(0, 10)
}

// "14:30:00" → "14:30" or pass-through if already HH:MM
function toTimeInput(val) {
  if (!val) return ''
  return val.slice(0, 5)
}

export default function CreateEventModal({ open, onClose, onCreated, event: editEvent }) {
  const isEdit = !!editEvent
  const [form, setForm] = useState(EMPTY)
  const [coverPreview, setCoverPreview] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const imgInputRef = useRef(null)

  const { data: subData } = useQuery({
    queryKey: ['tenant-subscription'],
    queryFn: getMySubscription,
    enabled: open
  })
  const hasWalletPlan = subData?.data?.subscription?.plan?.plan_type === 'WALLET'
    && (subData?.data?.wallet?.balance_credits ?? 0) > 0

  // Pre-fill form when opening in edit mode
  useEffect(() => {
    if (open && isEdit) {
      setForm({
        event_name: editEvent.event_name || '',
        event_date: toDateInput(editEvent.event_date),
        event_time: toTimeInput(editEvent.event_time),
        event_venue: editEvent.event_venue || '',
        event_organizer: editEvent.event_organizer || '',
        event_description: editEvent.event_description || '',
        event_organizer_phone_number: editEvent.event_organizer_phone_number || '',
        event_organizer_email_id: editEvent.event_organizer_email_id || '',
        is_ai_event: Boolean(editEvent.is_ai_event),
      })
      setCoverPreview(editEvent.profile_url ? backendAssetUrl(editEvent.profile_url) : null)
      setCoverFile(null)
    } else if (open && !isEdit) {
      setForm(EMPTY)
      setCoverPreview(null)
      setCoverFile(null)
    }
  }, [open, editEvent])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCoverPick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.event_name.trim()) { toast.error('Event name is required'); return }
    if (!form.event_date) { toast.error('Event date is required'); return }
    if (!form.event_time) { toast.error('Event time is required'); return }
    if (!form.event_venue.trim()) { toast.error('Venue is required'); return }
    if (!form.event_organizer.trim()) { toast.error('Organizer name is required'); return }
    if (!form.event_organizer_phone_number.trim()) { toast.error('Organizer phone is required'); return }
    if (!form.event_organizer_email_id.trim()) { toast.error('Organizer email is required'); return }
    if (!form.event_description.trim()) { toast.error('Description is required'); return }
    setLoading(true)
    try {
      let profile_url = undefined
      if (coverFile) {
        const fd = new FormData()
        fd.append('image', coverFile)
        const upRes = await uploadCoverImage(fd)
        profile_url = upRes?.data?.file_path || null
      }

      const payload = { ...form }
      if (profile_url !== undefined) payload.profile_url = profile_url

      let res
      if (isEdit) {
        res = await updateEvent(editEvent.event_id, payload)
        toast.success('Event updated!')
      } else {
        res = await createEvent(payload)
        toast.success('Event created!')
      }

      onCreated?.(res?.data)
      onClose()
    } catch (err) {
      toast.error(typeof err === 'string' ? err : isEdit ? 'Failed to update event' : 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Event' : 'Create New Event'} size="lg">
      <form onSubmit={handleSubmit}>
        {/* Cover image picker */}
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
            Cover Image (optional)
          </p>
          <div
            onClick={() => imgInputRef.current?.click()}
            className="relative h-32 rounded-xl overflow-hidden cursor-pointer group"
            style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-default)' }}
          >
            {coverPreview ? (
              <>
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity
                  flex items-center justify-center">
                  <UploadCloud size={20} className="text-white" />
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCoverPreview(null); setCoverFile(null) }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2
                group-hover:text-gold-500 transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                <UploadCloud size={22} />
                <p className="text-xs">Click to upload cover photo</p>
              </div>
            )}
          </div>
          <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverPick} />
        </div>

        {/* Two-column grid for fields */}
        <div className="grid grid-cols-2 gap-x-6">
          <div className="col-span-2">
            <GoldInput label="Event Name *" name="event_name" required value={form.event_name}
              onChange={e => update('event_name', e.target.value)} />
          </div>
          <GoldInput label="Event Date *" name="event_date" type="date" required value={form.event_date}
            onChange={e => update('event_date', e.target.value)} />
          <GoldInput label="Event Time *" name="event_time" type="time" required value={form.event_time}
            onChange={e => update('event_time', e.target.value)} />
          <GoldInput label="Venue *" name="event_venue" required value={form.event_venue}
            onChange={e => update('event_venue', e.target.value)} />
          <GoldInput label="Organizer Name *" name="event_organizer" required value={form.event_organizer}
            onChange={e => update('event_organizer', e.target.value)} />
          <GoldInput label="Organizer Phone *" name="event_organizer_phone_number" required value={form.event_organizer_phone_number}
            onChange={e => update('event_organizer_phone_number', e.target.value)} />
          <GoldInput label="Organizer Email *" name="event_organizer_email_id" type="email" required
            value={form.event_organizer_email_id}
            onChange={e => update('event_organizer_email_id', e.target.value)} />
          <div className="col-span-2">
            <GoldInput label="Description *" name="event_description" required value={form.event_description}
              onChange={e => update('event_description', e.target.value)} />
          </div>
        </div>

        <div
          className="flex items-center justify-between gap-3 mb-6 p-3 rounded-xl"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          title={hasWalletPlan ? '' : 'Requires an active Wallet plan with credits'}
        >
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: hasWalletPlan ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
            <Sparkles size={15} style={{ color: hasWalletPlan ? 'var(--accent-primary)' : 'var(--text-tertiary)' }} />
            AI Event
          </label>
          <input
            type="checkbox"
            checked={form.is_ai_event}
            disabled={!hasWalletPlan}
            onChange={e => update('is_ai_event', e.target.checked)}
            className="w-4 h-4 accent-[var(--accent-primary)] disabled:opacity-40"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <GoldButton type="submit" loading={loading} className="flex-1 justify-center">
            {isEdit ? 'Save Changes' : 'Create Event'}
          </GoldButton>
          <GoldButton type="button" variant="ghost" onClick={onClose}>Cancel</GoldButton>
        </div>
      </form>
    </Modal>
  )
}
