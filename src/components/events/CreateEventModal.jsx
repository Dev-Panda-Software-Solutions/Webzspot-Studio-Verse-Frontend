import React, { useRef, useState } from 'react'
import { UploadCloud, X } from 'lucide-react'
import Modal from '../ui/Modal'
import GoldButton from '../ui/GoldButton'
import GoldInput from '../ui/GoldInput'
import { createEvent } from '../../api/events'
import { uploadCoverImage } from '../../api/media'
import toast from 'react-hot-toast'

export default function CreateEventModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    event_name: '', event_date: '', event_time: '',
    event_venue: '', event_organizer: '', event_description: '',
    event_organizer_phone_number: '', event_organizer_email_id: ''
  })
  const [coverPreview, setCoverPreview] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const imgInputRef = useRef(null)

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
    setLoading(true)
    try {
      // Upload cover image first if provided
      let profile_url = null
      if (coverFile) {
        const fd = new FormData()
        fd.append('image', coverFile)
        const upRes = await uploadCoverImage(fd)
        profile_url = upRes?.data?.file_path || null
      }

      const payload = { ...form }
      if (profile_url) payload.profile_url = profile_url

      const res = await createEvent(payload)
      toast.success('Event created!')
      onCreated?.(res.data)
      onClose()
      setForm({
        event_name: '', event_date: '', event_time: '',
        event_venue: '', event_organizer: '', event_description: '',
        event_organizer_phone_number: '', event_organizer_email_id: ''
      })
      setCoverPreview(null)
      setCoverFile(null)
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create New Event" size="lg">
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
            <GoldInput label="Event Name *" name="event_name" value={form.event_name}
              onChange={e => update('event_name', e.target.value)} />
          </div>
          <GoldInput label="Event Date" name="event_date" type="date" value={form.event_date}
            onChange={e => update('event_date', e.target.value)} />
          <GoldInput label="Event Time" name="event_time" type="time" value={form.event_time}
            onChange={e => update('event_time', e.target.value)} />
          <GoldInput label="Venue" name="event_venue" value={form.event_venue}
            onChange={e => update('event_venue', e.target.value)} />
          <GoldInput label="Organizer Name" name="event_organizer" value={form.event_organizer}
            onChange={e => update('event_organizer', e.target.value)} />
          <GoldInput label="Organizer Phone" name="event_organizer_phone_number" value={form.event_organizer_phone_number}
            onChange={e => update('event_organizer_phone_number', e.target.value)} />
          <GoldInput label="Organizer Email" name="event_organizer_email_id" type="email"
            value={form.event_organizer_email_id}
            onChange={e => update('event_organizer_email_id', e.target.value)} />
          <div className="col-span-2">
            <GoldInput label="Description" name="event_description" value={form.event_description}
              onChange={e => update('event_description', e.target.value)} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <GoldButton type="submit" loading={loading} className="flex-1 justify-center">
            Create Event
          </GoldButton>
          <GoldButton type="button" variant="ghost" onClick={onClose}>Cancel</GoldButton>
        </div>
      </form>
    </Modal>
  )
}
