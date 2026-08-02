import React, { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Camera, UploadCloud, CheckCircle2, X } from 'lucide-react'
import GoldButton from '../../components/ui/GoldButton'
import GoldInput from '../../components/ui/GoldInput'
import { registerGuest } from '../../api/eventGuests'
import toast from 'react-hot-toast'

export default function GuestRegister() {
  const { eventId } = useParams()
  const [email, setEmail] = useState('')
  const [selfieFile, setSelfieFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const inputRef = useRef(null)

  const handlePick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelfieFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) { toast.error('Email is required'); return }
    if (!selfieFile) { toast.error('A selfie is required'); return }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('event_id', eventId)
      fd.append('guest_email', email.trim())
      fd.append('selfie', selfieFile)
      await registerGuest(fd)
      setDone(true)
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(52,211,153,0.15)' }}>
            <CheckCircle2 size={30} style={{ color: '#34D399' }} />
          </div>
          <h1 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>You're registered!</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            You'll receive your photos by email once the photographer publishes the event. No need to keep this page open.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gold-500 flex items-center justify-center mb-3 shadow-gold">
            <Camera size={22} className="text-black" />
          </div>
          <h1 className="font-display text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Get Your Photos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Upload a selfie and leave your email — we'll send you the photos you appear in.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            onClick={() => inputRef.current?.click()}
            className="relative h-40 rounded-xl overflow-hidden cursor-pointer mb-5"
            style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-default)' }}
          >
            {preview ? (
              <>
                <img src={preview} alt="Selfie preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreview(null); setSelfieFile(null) }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--text-tertiary)' }}>
                <UploadCloud size={24} />
                <p className="text-xs">Tap to take or upload a selfie</p>
              </div>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePick} />

          <GoldInput label="Email Address *" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />

          <GoldButton type="submit" loading={submitting} className="w-full justify-center mt-2">
            Register
          </GoldButton>
        </form>
      </div>
    </div>
  )
}
