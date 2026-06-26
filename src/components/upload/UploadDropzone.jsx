import React, { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import {
  UploadCloud, X, CheckCircle2, XCircle, Clock,
  Zap, Image, FileVideo, AlertCircle, Loader2, RotateCcw
} from 'lucide-react'
import { LARGE_UPLOAD_MAX_SIZE, LARGE_UPLOAD_THRESHOLD, uploadLargeMedia, uploadMedia } from '../../api/media'
import toast from 'react-hot-toast'

/* ─── Helpers ─── */
const fmtSize = (b) => {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)} GB`
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${b} B`
}
const fmtSpeed = (bps) => {
  if (bps >= 1024 ** 2) return `${(bps / 1024 ** 2).toFixed(1)} MB/s`
  if (bps >= 1024) return `${(bps / 1024).toFixed(0)} KB/s`
  return `${bps.toFixed(0)} B/s`
}
const fmtTime = (ms) => {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
const isVideoFile = (f) => f.type?.startsWith('video/')
const errorText = (err, fallback) => typeof err === 'string' ? err : fallback

/* ─── Per-file row in Status tab ─── */
function FileRow({ item, onRetry, retryDisabled }) {
  const { file, status, progress, speed, loaded, error } = item
  const isVid = isVideoFile(file)

  return (
    <div className="flex items-start gap-3 py-3"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      {/* Icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
        style={{ background: 'var(--bg-elevated)' }}>
        {isVid
          ? <FileVideo size={14} style={{ color: 'var(--text-tertiary)' }} />
          : <Image size={14} style={{ color: 'var(--text-tertiary)' }} />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {file.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {fmtSize(file.size)}
          </span>
          {status === 'uploading' && speed > 0 && (
            <>
              <span style={{ color: 'var(--border-default)' }}>·</span>
              <span className="text-xs" style={{ color: '#F59E0B' }}>{fmtSpeed(speed)}</span>
              {loaded < file.size && (
                <>
                  <span style={{ color: 'var(--border-default)' }}>·</span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    ~{fmtTime((file.size - loaded) / speed * 1000)} left
                  </span>
                </>
              )}
            </>
          )}
        </div>

        {status === 'uploading' && (
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #F59E0B, #FDE68A)',
              }}
            />
          </div>
        )}

        {status === 'uploading' && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {fmtSize(loaded)} / {fmtSize(file.size)} · {progress}%
          </p>
        )}

        {status === 'error' && error && (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#F87171' }}>
            {error}
          </p>
        )}
      </div>

      {/* Status badge */}
      <div className="flex-shrink-0 flex items-center gap-1 mt-0.5">
        {status === 'pending'   && <Clock size={15} style={{ color: 'var(--text-tertiary)' }} />}
        {status === 'uploading' && <Loader2 size={15} className="animate-spin" style={{ color: '#F59E0B' }} />}
        {status === 'done'      && <CheckCircle2 size={15} className="text-green-400" />}
        {status === 'error'     && (
          <>
            <XCircle size={15} className="text-red-400" />
            <button
              type="button"
              disabled={retryDisabled}
              onClick={() => onRetry(item)}
              className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50"
              style={{ color: '#F59E0B', background: 'var(--bg-elevated)' }}
              title="Retry upload"
            >
              <RotateCcw size={12} />
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Main component ─── */
export default function UploadDropzone({ eventId, onComplete }) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('upload')
  const [queue, setQueue] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)

  const panelRef = useRef(null)
  const zoneRef = useRef(null)
  const inputRef = useRef(null)

  /* ── Elapsed timer ── */
  useEffect(() => {
    if (!uploading || !startTime) return
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000)
    return () => clearInterval(id)
  }, [uploading, startTime])

  /* ── Panel open animation ── */
  useEffect(() => {
    if (open && panelRef.current) {
      gsap.fromTo(panelRef.current,
        { scale: 0.9, opacity: 0, y: 24 },
        { scale: 1, opacity: 1, y: 0, duration: 0.32, ease: 'back.out(1.4)' }
      )
    }
  }, [open])

  /* ── Upload speed tracking ── */
  const updateProgress = useCallback((id, loaded, total) => {
    const now = Date.now()
    setQueue(q => q.map(item => {
      if (item.id !== id) return item
      const dt = item._prevTime ? (now - item._prevTime) / 1000 : 0
      const dl = item._prevLoaded !== undefined ? loaded - item._prevLoaded : 0
      const instant = dt > 0.1 ? dl / dt : 0
      const speed = item.speed ? (item.speed * 0.65 + instant * 0.35) : instant
      return {
        ...item,
        progress: total > 0 ? Math.round((loaded / total) * 100) : 0,
        loaded,
        speed,
        _prevLoaded: loaded,
        _prevTime: now,
      }
    }))
  }, [])

  const updateStatus = useCallback((id, status, patch = {}) => {
    setQueue(q => q.map(item => item.id !== id ? item : { ...item, status, speed: 0, ...patch }))
  }, [])

  const uploadQueueItem = useCallback(async (item) => {
    if (item.file.size > LARGE_UPLOAD_MAX_SIZE) {
      const message = 'File too large. Maximum allowed is 5GB per file.'
      updateStatus(item.id, 'error', { error: message, progress: 0, loaded: 0 })
      toast.error(`${message}: ${item.file.name}`)
      return false
    }

    updateStatus(item.id, 'uploading', {
      error: null,
      progress: 0,
      loaded: 0,
      _prevLoaded: 0,
      _prevTime: 0,
    })

    try {
      if (item.file.size >= LARGE_UPLOAD_THRESHOLD) {
        await uploadLargeMedia({
          eventId,
          file: item.file,
          onProgress: (e) => updateProgress(item.id, e.loaded, e.total),
        })
      } else {
        const fd = new FormData()
        fd.append('event_id', eventId)
        fd.append('file', item.file)
        await uploadMedia(fd, (e) => updateProgress(item.id, e.loaded, e.total))
      }
      updateStatus(item.id, 'done', { error: null, progress: 100, loaded: item.file.size })
      return true
    } catch (err) {
      const message = errorText(err, `Failed: ${item.file.name}`)
      updateStatus(item.id, 'error', { error: message })
      toast.error(message)
      return false
    }
  }, [eventId, updateProgress, updateStatus])

  /* ── File processing ── */
  const processFiles = async (files) => {
    const newItems = Array.from(files).map(file => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
      progress: 0,
      loaded: 0,
      speed: 0,
      error: null,
      _prevLoaded: 0,
      _prevTime: 0,
    }))

    if (newItems.length === 0) return

    setQueue(prev => [...prev, ...newItems])
    setActiveTab('status')     // auto-switch to status
    setUploading(true)
    setStartTime(Date.now())
    setElapsed(0)

    let uploaded = 0
    let failed = 0
    for (const item of newItems) {
      const ok = await uploadQueueItem(item)
      if (ok) uploaded += 1
      else failed += 1
    }

    setUploading(false)
    onComplete?.()
    if (uploaded > 0 && failed === 0) toast.success('Upload complete!')
    if (uploaded > 0 && failed > 0) toast.success(`${uploaded} uploaded, ${failed} failed`)
  }

  const retryUpload = async (item) => {
    setActiveTab('status')
    setUploading(true)
    setStartTime(Date.now())
    setElapsed(0)
    const ok = await uploadQueueItem(item)
    setUploading(false)
    if (ok) {
      onComplete?.()
      toast.success(`Uploaded: ${item.file.name}`)
    }
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

  /* ── Aggregates ── */
  const totalBytes   = queue.reduce((s, f) => s + f.file.size, 0)
  const loadedBytes  = queue.reduce((s, f) => s + f.loaded, 0)
  const totalPct     = totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0
  const doneCount    = queue.filter(f => f.status === 'done').length
  const errorCount   = queue.filter(f => f.status === 'error').length
  const uploadingNow = queue.filter(f => f.status === 'uploading')
  const totalSpeed   = uploadingNow.reduce((s, f) => s + f.speed, 0)
  const bytesLeft    = totalBytes - loadedBytes
  const eta          = totalSpeed > 0 && bytesLeft > 0 ? bytesLeft / totalSpeed * 1000 : null
  const pendingCount = queue.filter(f => f.status === 'pending').length

  const closePanel = () => {
    if (panelRef.current) {
      gsap.to(panelRef.current, {
        scale: 0.9, opacity: 0, y: 16, duration: 0.2, ease: 'power2.in',
        onComplete: () => setOpen(false)
      })
    } else {
      setOpen(false)
    }
  }

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen(true)}
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
        <UploadCloud size={15} />
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

      {/* ── Popup panel ── */}
      {open && createPortal(
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closePanel() }}
        >
          <div ref={panelRef}
            className="w-full max-w-xl rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
              maxHeight: '85vh',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--accent-muted)' }}>
                  <UploadCloud size={14} className="text-gold-500" />
                </div>
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Upload Photos &amp; Videos
                </h2>
              </div>
              <button onClick={closePanel}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <X size={16} />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex flex-shrink-0 px-5 pt-3 gap-1"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {[
                { key: 'upload', label: 'Upload' },
                { key: 'status', label: queue.length > 0
                  ? `Status · ${doneCount + errorCount}/${queue.length}`
                  : 'Status'
                }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-150 relative"
                  style={{
                    color: activeTab === tab.key ? '#F59E0B' : 'var(--text-tertiary)',
                    background: activeTab === tab.key ? 'var(--bg-elevated)' : 'transparent',
                    borderBottom: activeTab === tab.key ? '2px solid #F59E0B' : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Upload tab ── */}
            {activeTab === 'upload' && (
              <div className="p-5 flex-1 overflow-y-auto">
                <div
                  ref={zoneRef}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onClick={() => inputRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                    transition-colors duration-200 relative overflow-hidden"
                  style={{
                    borderColor: dragging ? '#F59E0B' : 'var(--border-default)',
                    background: dragging ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                  }}
                >
                  <input ref={inputRef} type="file" multiple className="hidden"
                    accept="image/*,video/*" onChange={e => processFiles(e.target.files)} />

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
                        or click to browse — JPG, PNG, MP4, MOV · max 5GB each
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      <span className="flex items-center gap-1"><Image size={11} /> Photos</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><FileVideo size={11} /> Videos</span>
                    </div>
                  </div>
                </div>

                {queue.length > 0 && (
                  <p className="mt-3 text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
                    {queue.length} file{queue.length !== 1 ? 's' : ''} in queue ·{' '}
                    <button onClick={() => setActiveTab('status')} className="underline" style={{ color: '#F59E0B' }}>
                      View status →
                    </button>
                  </p>
                )}
              </div>
            )}

            {/* ── Status tab ── */}
            {activeTab === 'status' && (
              <div className="flex flex-col flex-1 min-h-0">
                {queue.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8">
                    <AlertCircle size={32} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No uploads yet</p>
                    <button onClick={() => setActiveTab('upload')}
                      className="text-xs underline mt-1" style={{ color: '#F59E0B' }}>
                      Go to Upload tab →
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Summary strip */}
                    <div className="px-5 py-4 flex-shrink-0"
                      style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>

                      {/* Total progress bar */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          Overall progress
                        </span>
                        <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>{totalPct}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden mb-3"
                        style={{ background: 'var(--bg-surface)' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${totalPct}%`,
                            background: 'linear-gradient(90deg, #F59E0B, #FDE68A)',
                            boxShadow: totalPct > 0 ? '0 0 8px rgba(245,158,11,0.5)' : 'none',
                          }} />
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: 'Uploaded', value: doneCount, color: '#34D399' },
                          { label: 'Uploading', value: uploadingNow.length, color: '#F59E0B' },
                          { label: 'Pending', value: pendingCount, color: 'var(--text-tertiary)' },
                          { label: 'Failed', value: errorCount, color: '#F87171' },
                        ].map(s => (
                          <div key={s.label} className="rounded-lg p-2"
                            style={{ background: 'var(--bg-surface)' }}>
                            <p className="text-base font-bold font-display"
                              style={{ color: s.value > 0 ? s.color : 'var(--text-tertiary)' }}>
                              {s.value}
                            </p>
                            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Speed + time row */}
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        {startTime && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            <Clock size={11} /> Elapsed: {fmtTime(elapsed)}
                          </span>
                        )}
                        {totalSpeed > 0 && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: '#F59E0B' }}>
                            <Zap size={11} /> {fmtSpeed(totalSpeed)}
                          </span>
                        )}
                        {eta !== null && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            <Clock size={11} /> ETA: ~{fmtTime(eta)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* File list */}
                    <div className="flex-1 overflow-y-auto px-5">
                      {queue.map(item => (
                        <FileRow
                          key={item.id}
                          item={item}
                          onRetry={retryUpload}
                          retryDisabled={uploading}
                        />
                      ))}
                    </div>

                    {/* Footer */}
                    {!uploading && queue.length > 0 && (
                      <div className="px-5 py-3 flex items-center justify-between flex-shrink-0"
                        style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <button onClick={() => setQueue([])}
                          className="text-xs transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                        >
                          Clear queue
                        </button>
                        <button onClick={() => setActiveTab('upload')}
                          className="text-xs font-medium" style={{ color: '#F59E0B' }}>
                          + Add more files
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
