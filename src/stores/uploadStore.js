import { create } from 'zustand'
import {
  LARGE_UPLOAD_MAX_SIZE,
  LARGE_UPLOAD_THRESHOLD,
  uploadLargeMedia,
  uploadMedia,
} from '../api/media'
import { getMySubscription } from '../api/billing'
import toast from 'react-hot-toast'

/* ─── Globally-persisted upload state ──────────────────────────────
   Upload progress used to live inside UploadDropzone's local state —
   closing the popup or navigating away hid the status forever even
   though the upload kept going. Now sessions live here so the status
   panel (mounted in AppLayout) can always show and reopen them. */

const errorText = (err, fallback) => typeof err === 'string' ? err : fallback

let uidCounter = 0
const uid = () => `${Date.now()}-${++uidCounter}`

// Module-level maps so the watchdog can reach in-flight requests even
// while no component is subscribed (survives navigation).
const lastProgressRef = {}
const controllersRef = {}

const useUploadStore = create((set, get) => ({
  sessions: {},       // key -> { eventId, galleryType, items, uploading, processing, startTime, onComplete }
  activeKey: null,    // which session the popup panel shows
  panelOpen: false,

  getKey: (eventId, galleryType) => `${eventId}::${galleryType}`,

  /* Add files to a session and start uploading. Returns the created items. */
  addFiles: async (eventId, galleryType, files, onComplete) => {
    const fileList = Array.from(files || [])
    if (fileList.length === 0) return []

    // Quota pre-check before queuing anything.
    try {
      const res = await getMySubscription()
      const subscription = res?.data?.subscription
      if (subscription?.photo_quota_total != null) {
        const remaining = subscription.photo_quota_total - subscription.photo_quota_used
        if (remaining <= 0) {
          toast.error('Your photo upload quota is used up. Upgrade your plan to upload more.')
          return []
        }
        if (fileList.length > remaining) {
          toast.error(`Only ${remaining} photo${remaining === 1 ? '' : 's'} left in your quota — you selected ${fileList.length}. Select ${remaining} or fewer.`)
          return []
        }
      }
    } catch {
      // Quota check failing shouldn't block upload entirely — the backend still enforces it per-file.
    }

    const items = fileList.map(file => ({
      id: uid(),
      file,
      status: 'pending',
      progress: 0,
      loaded: 0,
      speed: 0,
      error: null,
      _prevLoaded: 0,
      _prevTime: 0,
    }))

    const key = get().getKey(eventId, galleryType)
    const existing = get().sessions[key]

    set(state => ({
      sessions: {
        ...state.sessions,
        [key]: {
          eventId,
          galleryType,
          onComplete,
          items: existing ? [...existing.items, ...items] : items,
          uploading: true,
          processing: false,
          startTime: existing?.startTime || Date.now(),
        },
      },
      panelOpen: true,
      activeKey: key,
    }))

    get().processQueue(key)
    return items
  },

  /* ── Progress/speed tracking ── */
  updateProgress: (key, id, loaded, total) => {
    const now = Date.now()
    lastProgressRef[`${key}:${id}`] = now
    set(state => {
      const session = state.sessions[key]
      if (!session) return state
      return {
        sessions: {
          ...state.sessions,
          [key]: {
            ...session,
            items: session.items.map(item => {
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
            }),
          },
        },
      }
    })
  },

  updateStatus: (key, id, status, patch = {}) => {
    set(state => {
      const session = state.sessions[key]
      if (!session) return state
      return {
        sessions: {
          ...state.sessions,
          [key]: {
            ...session,
            items: session.items.map(item => item.id !== id ? item : { ...item, status, speed: 0, ...patch }),
          },
        },
      }
    })
  },

  /* ── Upload one item ── */
  uploadItem: async (key, item) => {
    const session = get().sessions[key]
    if (!session) return false

    if (item.file.size > LARGE_UPLOAD_MAX_SIZE) {
      const message = 'File too large. Maximum allowed is 5GB per file.'
      get().updateStatus(key, item.id, 'error', { error: message, progress: 0, loaded: 0 })
      toast.error(`${message}: ${item.file.name}`)
      return false
    }

    get().updateStatus(key, item.id, 'uploading', {
      error: null, progress: 0, loaded: 0, _prevLoaded: 0, _prevTime: 0,
    })
    lastProgressRef[`${key}:${item.id}`] = Date.now()

    const controller = new AbortController()
    controllersRef[`${key}:${item.id}`] = controller
    const onProgress = (e) => get().updateProgress(key, item.id, e.loaded, e.total)

    try {
      if (item.file.size >= LARGE_UPLOAD_THRESHOLD) {
        await uploadLargeMedia({
          eventId: session.eventId,
          file: item.file,
          onProgress,
          signal: controller.signal,
          galleryType: session.galleryType,
        })
      } else {
        const fd = new FormData()
        fd.append('event_id', session.eventId)
        fd.append('file', item.file)
        fd.append('gallery_type', session.galleryType)
        await uploadMedia(fd, onProgress, controller.signal)
      }
      get().updateStatus(key, item.id, 'done', { error: null, progress: 100, loaded: item.file.size })
      return true
    } catch (err) {
      // A cancellation we triggered ourselves (stall watchdog) isn't a real
      // failure — the item is about to be retried, so stay silent.
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
        return false
      }
      const message = errorText(err, `Failed: ${item.file.name}`)
      get().updateStatus(key, item.id, 'error', { error: message })
      toast.error(message)
      return false
    } finally {
      delete controllersRef[`${key}:${item.id}`]
    }
  },

  /* ── Sequential queue processor ── */
  processQueue: async (key) => {
    const session = get().sessions[key]
    if (!session || session.processing) return

    set(state => ({
      sessions: {
        ...state.sessions,
        [key]: { ...state.sessions[key], processing: true },
      },
    }))

    let uploaded = 0
    let failed = 0
    try {
      const pending = get().sessions[key]?.items.filter(i => i.status === 'pending') || []
      for (const item of pending) {
        const ok = await get().uploadItem(key, item)
        if (ok) uploaded += 1
        else failed += 1
      }
      if (uploaded > 0 && failed === 0) toast.success('Upload complete!')
      if (uploaded > 0 && failed > 0) toast.success(`${uploaded} uploaded, ${failed} failed`)
    } finally {
      set(state => {
        const s = state.sessions[key]
        if (!s) return state
        return {
          sessions: {
            ...state.sessions,
            [key]: { ...s, processing: false, uploading: false },
          },
        }
      })
      get().sessions[key]?.onComplete?.()
    }
  },

  /* ── Retry a failed item ── */
  retryItem: (key, id) => {
    const session = get().sessions[key]
    const item = session?.items.find(i => i.id === id)
    if (!item) return
    set(state => ({
      sessions: {
        ...state.sessions,
        [key]: { ...state.sessions[key], uploading: true },
      },
    }))
    get().uploadItem(key, item).then(ok => {
      set(state => {
        const s = state.sessions[key]
        if (!s) return state
        return {
          sessions: {
            ...state.sessions,
            [key]: { ...s, uploading: false },
          },
        }
      })
      if (ok) get().sessions[key]?.onComplete?.()
    })
  },

  /* ── Stall watchdog ──
     Backgrounded tabs can throttle long uploads hard enough that the
     request silently stalls. Poll for items stuck on "uploading" with no
     progress and abort + restart just that item. */
  watchdogTick: () => {
    const STALL_MS = 25000
    const now = Date.now()
    Object.entries(get().sessions).forEach(([key, session]) => {
      session.items.forEach(item => {
        if (item.status !== 'uploading') return
        const last = lastProgressRef[`${key}:${item.id}`] || 0
        if (now - last <= STALL_MS) return
        lastProgressRef[`${key}:${item.id}`] = now // avoid re-triggering before the retry lands
        controllersRef[`${key}:${item.id}`]?.abort()
        setTimeout(() => {
          get().uploadItem(key, item).then(ok => {
            if (ok) get().sessions[key]?.onComplete?.()
          })
        }, 500)
      })
    })
  },

  clearQueue: (key) => set(state => {
    const { [key]: _drop, ...rest } = state.sessions
    return {
      sessions: rest,
      activeKey: state.activeKey === key ? null : state.activeKey,
      panelOpen: state.activeKey === key ? false : state.panelOpen,
    }
  }),

  openPanel: (key) => set({ panelOpen: true, activeKey: key }),
  closePanel: () => set({ panelOpen: false }),
}))

// Watchdog keeps running for as long as the tab is alive — independent of
// any mounted component, so it fires as soon as the tab regains focus.
setInterval(() => {
  useUploadStore.getState().watchdogTick()
}, 5000)

export default useUploadStore
