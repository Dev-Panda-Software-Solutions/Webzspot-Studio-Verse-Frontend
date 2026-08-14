import React, { useRef, useState } from 'react'
import { gsap } from 'gsap'
import { UploadCloud, Image, FileVideo } from 'lucide-react'
import { ALLOWED_MEDIA_EXTS } from '../../api/media'
import { validateMediaFile } from '../../api/media'
import ApertureSpinner from '../ui/StudioLoader'
import useUploadStore from '../../stores/uploadStore'
import toast from 'react-hot-toast'

const MEDIA_ACCEPT = ALLOWED_MEDIA_EXTS.join(',')

/* ── Main component ──
   Trigger button + page-level drop zone. The popup status panel lives
   globally (UploadStatusPanel, mounted in AppLayout) so progress stays
   visible even after closing the popup or navigating away. */
export default function UploadDropzone({ eventId, onComplete, galleryType = 'PHOTO_SELECTION' }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  const zoneRef = useRef(null)

  const key = useUploadStore(s => s.getKey(eventId, galleryType))
  const session = useUploadStore(s => s.sessions[key])
  const openPanel = useUploadStore(s => s.openPanel)

  /* ── Aggregates from the shared store ── */
  const queue = session?.items || []
  const uploading = Boolean(session?.uploading)
  const totalBytes = queue.reduce((s, f) => s + f.file.size, 0)
  const loadedBytes = queue.reduce((s, f) => s + f.loaded, 0)
  const totalPct = totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0

  const processFiles = async (files) => {
    const fileList = Array.from(files)
    if (fileList.length === 0) return

    const acceptedFiles = []
    const rejectedFiles = []
    fileList.forEach(file => {
      const error = validateMediaFile(file)
      if (error) rejectedFiles.push({ file, error })
      else acceptedFiles.push(file)
    })

    if (rejectedFiles.length > 0) {
      const names = rejectedFiles.slice(0, 3).map(item => item.file.name).join(', ')
      const extra = rejectedFiles.length > 3 ? ` +${rejectedFiles.length - 3} more` : ''
      toast.error(`${rejectedFiles[0].error} Rejected: ${names}${extra}`)
    }
    if (acceptedFiles.length === 0) return

    await useUploadStore.getState().addFiles(eventId, galleryType, acceptedFiles, onComplete)
    openPanel(key)
  }

  /* ── Drag handlers ── */
  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    gsap.to(zoneRef.current, { scale: 1, duration: 0.2 })
    processFiles(e.dataTransfer.files)
  }
  const onDragOver = (e) => {
    e.preventDefault()
    if (!dragging) {
      setDragging(true)
      gsap.to(zoneRef.current, { scale: 1.025, duration: 0.2 })
    }
  }
  const onDragLeave = () => {
    setDragging(false)
    gsap.to(zoneRef.current, { scale: 1, duration: 0.2 })
  }

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={() => openPanel(key)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
          transition-all duration-200 relative overflow-hidden group"
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.08))',
          border: '1px solid rgba(245,158,11,0.3)',
          color: '#F59E0B',
        }}
        onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.04, duration: 0.18, ease: 'power2.out' })}
        onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.2, ease: 'power2.out' })}
      >
        {uploading
          ? <ApertureSpinner size={15} />
          : <UploadCloud size={15} />
        }
        Upload Photos &amp; Videos
        {uploading && (
          <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: '#F59E0B', color: '#000' }}>
            {totalPct}%
          </span>
        )}
        {/* shimmer */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-600 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.1), transparent)' }} />
      </button>

      {/* ── Page-level drop zone ── */}
      <div
        ref={zoneRef}
        onDrop={uploading ? undefined : onDrop}
        onDragOver={uploading ? undefined : onDragOver}
        onDragLeave={uploading ? undefined : onDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors duration-200 relative overflow-hidden ${uploading ? 'cursor-default' : 'cursor-pointer'}`}
        style={{
          borderColor: uploading ? 'rgba(245,158,11,0.4)' : dragging ? '#F59E0B' : 'var(--border-default)',
          background: uploading ? 'rgba(245,158,11,0.05)' : dragging ? 'var(--accent-muted)' : 'var(--bg-elevated)',
        }}
      >
        <input ref={inputRef} type="file" multiple className="hidden"
          accept={MEDIA_ACCEPT} onChange={e => processFiles(e.target.files)} />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <ApertureSpinner size={28} />
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Uploading… {totalPct}%
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Track progress anytime via the floating status panel
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: dragging ? 'rgba(245,158,11,0.2)' : 'var(--bg-surface)' }}>
              <UploadCloud size={28}
                style={{ color: dragging ? '#F59E0B' : 'var(--text-tertiary)' }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {dragging ? 'Drop to upload' : 'Drag & drop photos here'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                or click to browse — JPG, PNG, MP4, MOV, MP3, WAV · max 5GB each
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <span className="flex items-center gap-1"><Image size={11} /> Photos</span>
              <span>·</span>
              <span className="flex items-center gap-1"><FileVideo size={11} /> Videos</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
