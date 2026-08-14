import React, { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { gsap } from 'gsap'
import {
  UploadCloud, X, CheckCircle2, XCircle, Clock,
  Zap, Image, FileVideo, AlertCircle, Loader2, RotateCcw
} from 'lucide-react'
import useUploadStore from '../../stores/uploadStore'
import { ALLOWED_MEDIA_EXTS } from '../../api/media'
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
const MEDIA_ACCEPT = ALLOWED_MEDIA_EXTS.join(',')

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

/* ─── Global upload status panel ────────────────────────────────
   Mounted once in AppLayout so upload progress survives navigating
   between pages. Shows a floating progress badge while uploading and
   a full popup with per-file status that can be reopened anytime. */
export default function UploadStatusPanel() {
  const [activeTab, setActiveTab] = useState('status')
  const [dragging, setDragging] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const inputRef = useRef(null)
  const zoneRef = useRef(null)
  const panelRef = useRef(null)

  const sessions = useUploadStore(s => s.sessions)
  const activeKey = useUploadStore(s => s.activeKey)
  const panelOpen = useUploadStore(s => s.panelOpen)
  const openPanel = useUploadStore(s => s.openPanel)
  const closePanel = useUploadStore(s => s.closePanel)
  const clearQueue = useUploadStore(s => s.clearQueue)
  const retryItem = useUploadStore(s => s.retryItem)
  const addFiles = useUploadStore(s => s.addFiles)

  const session = activeKey ? sessions[activeKey] : null
  const queue = session?.items || []
  const uploading = Boolean(session?.uploading)

  /* ── Floating badge aggregate over ALL sessions (any event) ── */
  const allSessions = Object.values(sessions)
  const anyUploading = allSessions.some(s => s.uploading)
  const anyQueue = allSessions.reduce((sum, s) => sum + s.items.length, 0)
  const totalBytes = allSessions.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.file.size, 0), 0)
  const loadedBytes = allSessions.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.loaded, 0), 0)
  const totalPct = totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0

  /* ── Elapsed timer for the active session ── */
  useEffect(() => {
    if (!panelOpen || !session?.startTime) return
    const id = setInterval(() => setElapsed(Date.now() - session.startTime), 1000)
    return () => clearInterval(id)
  }, [panelOpen, session?.startTime])

  /* ── Panel open animation ── */
  useEffect(() => {
    if (panelOpen && panelRef.current) {
      gsap.fromTo(panelRef.current,
        { scale: 0.9, opacity: 0, y: 24 },
        { scale: 1, opacity: 1, y: 0, duration: 0.32, ease: 'back.out(1.4)' }
      )
    }
  }, [panelOpen])

  /* ── Aggregate stats for the active session ── */
  const doneCount = queue.filter(f => f.status === 'done').length
  const errorCount = queue.filter(f => f.status === 'error').length
  const uploadingNow = queue.filter(f => f.status === 'uploading')
  const pendingCount = queue.filter(f => f.status === 'pending').length
  const sessionLoaded = queue.reduce((s, f) => s + f.loaded, 0)
  const sessionTotal = queue.reduce((s, f) => s + f.file.size, 0)
  const sessionPct = sessionTotal > 0 ? Math.round((sessionLoaded / sessionTotal) * 100) : 0
  const totalSpeed = uploadingNow.reduce((s, f) => s + f.speed, 0)
  const bytesLeft = sessionTotal - sessionLoaded
  const eta = totalSpeed > 0 && bytesLeft > 0 ? bytesLeft / totalSpeed * 1000 : null

  const closeWithAnim = () => {
    if (panelRef.current) {
      gsap.to(panelRef.current, {
        scale: 0.9, opacity: 0, y: 16, duration: 0.2, ease: 'power2.in',
        onComplete: () => closePanel()
      })
    } else {
      closePanel()
    }
  }

  /* ── Drop zone inside the popup's Upload tab ── */
  const processFiles = async (files) => {
    const fileList = Array.from(files)
    if (fileList.length === 0 || !session) return
    const added = await addFiles(session.eventId, session.galleryType, fileList, session.onComplete)
    if (added.length > 0) setActiveTab('status')
  }
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

  const retryUpload = (item) => {
    setActiveTab('status')
    retryItem(activeKey, item.id)
  }

  return (
    <>
      {/* ── Floating badge — shown while any upload is running, even when the popup is closed ── */}
      {anyUploading && !panelOpen && (
        <button
          onClick={() => openPanel(activeKey || allSessions[0]?.key || null)}
          className="fixed bottom-6 right-6 z-[9980] flex items-center gap-3 rounded-full pl-3 pr-5 py-2.5 shadow-lg transition-transform hover:scale-105"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }}
        >
          <span className="relative flex items-center justify-center w-8 h-8 rounded-full"
            style={{ background: 'var(--accent-muted)' }}>
            <Loader2 size={15} className="animate-spin" style={{ color: '#F59E0B' }} />
          </span>
          <span className="text-left">
            <span className="block text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Uploading… {totalPct}%
            </span>
            <span className="block text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {doneCount} of {queue.length || anyQueue} done · tap to view
            </span>
          </span>
        </button>
      )}

      {/* ── Popup panel ── */}
      {panelOpen && session && createPortal(
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeWithAnim() }}
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
              <button onClick={closeWithAnim}
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
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={26} className="animate-spin" style={{ color: '#F59E0B' }} />
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        Uploading… {sessionPct}%
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        You can add more files once the current batch finishes
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
                        <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>{sessionPct}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden mb-3"
                        style={{ background: 'var(--bg-surface)' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${sessionPct}%`,
                            background: 'linear-gradient(90deg, #F59E0B, #FDE68A)',
                            boxShadow: sessionPct > 0 ? '0 0 8px rgba(245,158,11,0.5)' : 'none',
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
                        {session?.startTime && (
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
                        <button onClick={() => clearQueue(activeKey)}
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
