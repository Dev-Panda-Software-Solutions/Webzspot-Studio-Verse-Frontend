import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UploadCloud, X, Sparkles, Crop, Check, Download, ShieldOff } from 'lucide-react'
import Cropper from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import Modal from '../ui/Modal'
import GoldButton from '../ui/GoldButton'
import GoldInput from '../ui/GoldInput'
import { createEvent, updateEvent } from '../../api/events'
import { uploadCoverImage } from '../../api/media'
import { getMySubscription } from '../../api/billing'
import { backendAssetUrl } from '../../utils/apiUrl'
import toast from 'react-hot-toast'

const EMPTY = {
  event_name: '', event_date: '',
  event_venue: '', event_organizer: '', event_description: '',
  event_organizer_phone_number: '', event_organizer_email_id: '',
  allow_download: true,
}

function toDateInput(val) {
  if (!val) return ''
  return new Date(val).toISOString().slice(0, 10)
}

// Cover is displayed as a wide horizontal banner everywhere (hero + cards),
// so the crop is locked to 16:9.
const COVER_ASPECT = 16 / 9
// Downscale the cropped output so huge originals (no more 5MB limit) don't
// overflow the canvas — 2400px is plenty for the widest hero banner.
const MAX_OUTPUT_SIZE = 2400

function getCroppedBlob(imageSrc, pixelCrop) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, MAX_OUTPUT_SIZE / Math.max(pixelCrop.width, pixelCrop.height))
      const w = Math.round(pixelCrop.width * scale)
      const h = Math.round(pixelCrop.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, w, h)
      canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Crop failed'))), 'image/jpeg', 0.92)
    }
    image.onerror = reject
    image.src = imageSrc
  })
}

export default function CreateEventModal({ open, onClose, onCreated, event: editEvent }) {
  const isEdit = !!editEvent
  const [form, setForm] = useState(EMPTY)
  const [coverPreview, setCoverPreview] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const imgInputRef = useRef(null)

  // Crop state
  const [cropSrc, setCropSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [cropping, setCropping] = useState(false)

  const { data: subData } = useQuery({
    queryKey: ['tenant-subscription'],
    queryFn: getMySubscription,
    enabled: open
  })
  // Whether the created event gets an AI Media module is decided entirely by
  // the studio's current plan — not a per-event choice.
  const planIncludesAi = Boolean(subData?.data?.subscription?.plan?.includes_ai_media)

  // Pre-fill form when opening in edit mode
  useEffect(() => {
    if (open && isEdit) {
      setForm({
        event_name: editEvent.event_name || '',
        event_date: toDateInput(editEvent.event_date),
        event_venue: editEvent.event_venue || '',
        event_organizer: editEvent.event_organizer || '',
        event_description: editEvent.event_description || '',
        event_organizer_phone_number: editEvent.event_organizer_phone_number || '',
        event_organizer_email_id: editEvent.event_organizer_email_id || '',
        allow_download: editEvent.allow_download !== false,
      })
      setCoverPreview(editEvent.profile_url ? backendAssetUrl(editEvent.profile_url) : null)
      setCoverFile(null)
    } else if (open && !isEdit) {
      setForm(EMPTY)
      setCoverPreview(null)
      setCoverFile(null)
    }
    // Reset crop state every time the modal opens
    setCropSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
  }, [open, editEvent])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCoverPick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(null)
    setCropSrc(URL.createObjectURL(file))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  const onCropComplete = useCallback((_area, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleApplyCrop = async () => {
    if (!cropSrc || !croppedAreaPixels) return
    setCropping(true)
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels)
      const file = new File([blob], 'cover.jpg', { type: 'image/jpeg' })
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(blob))
      setCropSrc(null)
      toast.success('Cover cropped!')
    } catch {
      toast.error('Failed to crop image. Please try another image.')
    } finally {
      setCropping(false)
    }
  }

  const handleCancelCrop = () => {
    setCropSrc(null)
    setCoverFile(null)
    setCoverPreview(null)
    if (imgInputRef.current) imgInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.event_name.trim()) { toast.error('Event name is required'); return }
    if (!form.event_date) { toast.error('Event date is required'); return }
    if (!form.event_venue.trim()) { toast.error('Venue is required'); return }
    if (!form.event_organizer.trim()) { toast.error('Organizer name is required'); return }
    if (!form.event_organizer_phone_number.trim()) { toast.error('Organizer phone is required'); return }
    if (!form.event_organizer_email_id.trim()) { toast.error('Organizer email is required'); return }
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

          {cropSrc ? (
            /* ─── Crop step ─── */
            <div>
              <div className="relative w-full h-72 rounded-xl overflow-hidden"
                style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-default)' }}>
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={COVER_ASPECT}
                  cropShape="rect"
                  showGrid
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>Zoom</span>
                <input
                  type="range" min={1} max={3} step={0.01} value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  className="gallery-zoom-slider flex-1"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <GoldButton type="button" loading={cropping} onClick={handleApplyCrop}
                  icon={<Check size={14} />} className="flex-1 justify-center">
                  Apply Crop
                </GoldButton>
                <GoldButton type="button" variant="ghost" onClick={handleCancelCrop}>
                  Cancel
                </GoldButton>
              </div>
            </div>
          ) : (
            <>
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
                      <Crop size={20} className="text-white" />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleCancelCrop() }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2
                    group-hover:text-gold-500 transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                    <UploadCloud size={22} />
                    <p className="text-xs">Click to upload cover photo — it will be cropped to 16:9</p>
                  </div>
                )}
              </div>
              <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverPick} />
            </>
          )}
        </div>

        {/* Two-column grid for fields */}
        <div className="grid grid-cols-2 gap-x-6">
          <div className="col-span-2">
            <GoldInput label="Event Name *" name="event_name" required value={form.event_name}
              onChange={e => update('event_name', e.target.value)} />
          </div>
          <GoldInput label="Event Date *" name="event_date" type="date" required value={form.event_date}
            onChange={e => update('event_date', e.target.value)} />
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
            <GoldInput label="Description (optional)" name="event_description" value={form.event_description}
              onChange={e => update('event_description', e.target.value)} />
          </div>

          {/* Allow downloads toggle */}
          <div className="col-span-2 flex items-center justify-between gap-4 p-4 rounded-xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: form.allow_download ? 'rgba(245,158,11,0.12)' : 'rgba(248,113,113,0.10)' }}>
                {form.allow_download
                  ? <Download size={16} className="text-gold-500" />
                  : <ShieldOff size={16} style={{ color: '#F87171' }} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Allow clients to download their photos
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {form.allow_download
                    ? 'Clients can download their favourite photos as a zip.'
                    : 'Clients can view and favourite photos, but cannot download them.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.allow_download}
              onClick={() => update('allow_download', !form.allow_download)}
              className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
              style={{
                background: form.allow_download ? '#F59E0B' : 'var(--border-default)',
              }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: form.allow_download ? 'calc(100% - 1.375rem)' : '0.125rem' }}
              />
            </button>
          </div>
        </div>

        {!isEdit && (
          <div
            className="flex items-center gap-2 mb-6 p-3 rounded-xl text-sm"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
          >
            <Sparkles size={15} style={{ color: planIncludesAi ? 'var(--accent-primary)' : 'var(--text-tertiary)' }} />
            {planIncludesAi
              ? 'Your plan includes AI Media — this event will get both Photo Selection and AI Media galleries.'
              : 'This event will get a Photo Selection gallery. Upgrade to an AI-enabled plan to add AI Media.'}
          </div>
        )}

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
