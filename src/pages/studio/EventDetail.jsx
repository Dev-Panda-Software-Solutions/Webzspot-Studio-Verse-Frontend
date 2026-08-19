import React, { useLayoutEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Users, UserPlus, UserCheck,
  Calendar, Ban, CheckCircle2, ChevronDown, ChevronUp, Search, HardDrive, Download, Trash2,
  Lock, Send, Unlock, AlertTriangle, Sparkles, QrCode, Mail, Rocket
} from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import GoldButton from '../../components/ui/GoldButton'
import GlassCard from '../../components/ui/GlassCard'
import PhotoGrid from '../../components/gallery/PhotoGrid'
import UploadDropzone from '../../components/upload/UploadDropzone'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import GoldInput from '../../components/ui/GoldInput'
import Avatar from '../../components/ui/Avatar'
import { getEventById, getEventFavouritesGrouped, getEventUsers, assignUserToEvent, updateEventUserMapping, hardDeleteUserFromEvent, publishEvent } from '../../api/events'
import { getMediaByEvent, deleteMedia, restoreMedia, hardDeleteMedia, copyMediaToGallery } from '../../api/media'
import { createUserInEvent, getUsers, checkDuplicateClient } from '../../api/users'
import { downloadFavouritesZip, downloadStudioFavouritesZip } from '../../api/media'
import { getTenantSettings } from '../../api/tenants'
import { getTenantFavouritesForEvent } from '../../api/favourites'
import { getGuestsByEvent } from '../../api/eventGuests'
import { formatDate, clientDisplayName } from '../../utils/formatters'
import useAuthStore from '../../stores/authStore'
import FavouritesGallery from '../../components/gallery/FavouritesGallery'
import EventQrCode from '../../components/events/EventQrCode'
import { backendAssetUrl } from '../../utils/apiUrl'
import { confirmDialog } from '../../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

const BASE_TABS = ['Photo Selection', 'Clients', 'Favourites']

/* ── Access expiry badge ─────────────────────────────────── */
function AccessBadge({ access_expires, isactive }) {
  if (!isactive) return <Badge variant="error">Revoked</Badge>
  if (!access_expires) return <Badge variant="success">Active</Badge>
  const expired = new Date(access_expires) < new Date()
  return (
    <Badge variant={expired ? 'error' : 'success'}>
      {expired ? 'Expired' : `Until ${formatDate(access_expires)}`}
    </Badge>
  )
}

/* ── Inline access extend panel ──────────────────────────── */
function AccessPanel({ mapping, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [newExpiry, setNewExpiry] = useState(
    mapping.access_expires ? new Date(mapping.access_expires).toISOString().split('T')[0] : ''
  )
  const [favLimit, setFavLimit] = useState(mapping.favourite_limit ?? '')
  const [saving, setSaving] = useState(false)

  const handleExtend = async () => {
    setSaving(true)
    try {
      await onUpdate(mapping.event_user_id, {
        access_expires: newExpiry || null,
        favourite_limit: favLimit === '' ? null : Number(favLimit),
      })
      setOpen(false)
      toast.success('Access updated')
    } catch { toast.error('Failed to update access') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs transition-colors"
        style={{ color: 'var(--text-tertiary)' }}
        onMouseEnter={e => e.currentTarget.style.color = '#F59E0B'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
      >
        <Calendar size={11} />
        {open ? 'Close' : 'Edit access'}
        {mapping.favourite_limit != null && (
          <span style={{ color: 'var(--text-tertiary)' }}>· limit {mapping.favourite_limit}</span>
        )}
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>

      {open && (
        <div className="mt-2 p-3 rounded-xl flex items-end gap-2 flex-wrap"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--text-tertiary)' }}>
              Access expires (leave empty = no expiry)
            </label>
            <input
              type="date"
              value={newExpiry}
              onChange={e => setNewExpiry(e.target.value)}
              className="w-full text-xs rounded-lg px-3 py-2 outline-none"
              style={{
                background: 'var(--bg-surface)', color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            />
          </div>
          <div className="w-28">
            <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--text-tertiary)' }}>
              Favourite limit
            </label>
            <input
              type="number"
              min="0"
              placeholder="No limit"
              value={favLimit}
              onChange={e => setFavLimit(e.target.value)}
              className="w-full text-xs rounded-lg px-3 py-2 outline-none"
              style={{
                background: 'var(--bg-surface)', color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            />
          </div>
          <GoldButton size="sm" onClick={handleExtend} loading={saving}>Save</GoldButton>
        </div>
      )}
    </div>
  )
}

/* ── Client row ──────────────────────────────────────────── */
function ClientRow({ mapping, onUpdate, onRevokeToggle, onHardDelete, onToggleSubmission }) {
  const u = mapping.user
  const isRevoked = !mapping.isactive
  const isSubmitted = !!mapping.favourites_submitted_at
  return (
    <div className="flex items-start gap-4 px-5 py-4 border-b transition-colors"
      style={{ borderColor: 'var(--border-subtle)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <Avatar name={u.user_name} size="sm" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.user_name}</p>
          <AccessBadge access_expires={mapping.access_expires} isactive={mapping.isactive} />
          {isSubmitted ? (
            <Badge variant="success"><Lock size={9} className="inline mr-0.5" />Submitted</Badge>
          ) : (
            <Badge variant="info">Not submitted</Badge>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {u.user_email_id || u.user_phone_number || '—'}
        </p>
        <div className="mt-1.5 flex items-center gap-3 flex-wrap">
          <AccessPanel mapping={mapping} onUpdate={onUpdate} />
          <button
            onClick={() => onToggleSubmission(mapping.event_user_id, isSubmitted, u.user_name)}
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: isSubmitted ? '#FBBF24' : '#34D399' }}
          >
            {isSubmitted ? <><Unlock size={11} /> Unlock for editing</> : <><Send size={11} /> Submit for client</>}
          </button>
        </div>
      </div>

      {/* Revoke/Restore this event's access only (doesn't touch login or other events) + permanent removal — always visible */}
      <div className="flex-shrink-0 flex items-center gap-1">
        <button
          onClick={() => onRevokeToggle(mapping.event_user_id, isRevoked, u.user_name)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: isRevoked ? '#34D399' : '#F87171', background: isRevoked ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)' }}
          title={isRevoked ? 'Restore access to this event' : 'Revoke access to this event (login and other events unaffected)'}
        >
          {isRevoked ? <CheckCircle2 size={14} /> : <Ban size={14} />}
        </button>
        <button
          onClick={() => onHardDelete(mapping.event_user_id, u.user_name)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: '#F87171', background: 'rgba(248,113,113,0.08)' }}
          title="Permanently remove this client from this event"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

/* ── Add Client modal ────────────────────────────────────── */
function AddClientModal({ open, onClose, eventId, qc }) {
  const [mode, setMode] = useState('existing')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [accessExpires, setAccessExpires] = useState('')
  const [assigning, setAssigning] = useState(false)

  // New client form
  const [newClient, setNewClient] = useState({ username: '', password: '' })
  const [creating, setCreating] = useState(false)
  // null = not checked yet against this name/phone/email combo; [] = checked,
  // no matches; non-empty = matches found and creation is paused on them.
  const [duplicates, setDuplicates] = useState(null)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)

  const { data: usersData } = useQuery({
    queryKey: ['tenant-users'],
    queryFn: () => getUsers({ page: 1, limit: 100 }),
    enabled: open && mode === 'existing',
  })

  const allUsers = usersData?.data?.items || []
  const filtered = allUsers.filter(u =>
    !search ||
    u.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.user_email_id?.toLowerCase().includes(search.toLowerCase())
  )

  const reset = () => {
    setSearch('')
    setSelected(null)
    setAccessExpires('')
    setNewClient({ username: '', password: '' })
    setDuplicates(null)
  }

  const handleClose = () => { reset(); setMode('existing'); onClose() }

  // Any edit to the username invalidates whatever duplicate check already ran
  const updateNewClient = (key, value) => {
    setNewClient(f => ({ ...f, [key]: value }))
    setDuplicates(null)
  }

  const handleAssignExisting = async () => {
    if (!selected) return
    setAssigning(true)
    try {
      await assignUserToEvent({
        event_id: eventId,
        user_id: selected.user_id,
        access_expires: accessExpires || undefined,
      })
      toast.success(`${selected.user_name} added to event`)
      qc.invalidateQueries(['event-users', eventId])
      handleClose()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to assign client') }
    finally { setAssigning(false) }
  }

  const doCreate = async () => {
    setCreating(true)
    try {
      await createUserInEvent({
        user_name: newClient.username,
        username: newClient.username,
        password: newClient.password,
        event_id: eventId,
        validity_days: 365,
        expiry_date: accessExpires
          ? new Date(accessExpires).toISOString().split('T')[0]
          : new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      })
      toast.success('New client created and added to event')
      qc.invalidateQueries(['event-users', eventId])
      qc.invalidateQueries(['tenant-users'])
      handleClose()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to create client') }
    finally { setCreating(false) }
  }

  const handleCreateNew = async (e) => {
    e.preventDefault()

    if (duplicates === null) {
      setCheckingDuplicates(true)
      try {
        const res = await checkDuplicateClient({ username: newClient.username })
        const matches = res?.data || []
        setDuplicates(matches)
        if (matches.length > 0) { setCheckingDuplicates(false); return }
      } catch {
        // Fail open — a broken duplicate check shouldn't block client creation.
        setDuplicates([])
      }
      setCheckingDuplicates(false)
    }

    await doCreate()
  }

  const assignDuplicateInstead = async (user) => {
    setAssigning(true)
    try {
      await assignUserToEvent({ event_id: eventId, user_id: user.user_id, access_expires: accessExpires || undefined })
      toast.success(`${user.user_name} added to event`)
      qc.invalidateQueries(['event-users', eventId])
      handleClose()
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to assign client') }
    finally { setAssigning(false) }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Client to Event" size="md">
      {/* Mode selector */}
      <div className="flex gap-1 p-1 rounded-xl mb-5"
        style={{ background: 'var(--bg-elevated)' }}>
        {[
          { key: 'existing', label: 'Existing Client', icon: UserCheck },
          { key: 'new', label: 'New Client', icon: UserPlus },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: mode === key ? 'var(--bg-surface)' : 'transparent',
              color: mode === key ? '#F59E0B' : 'var(--text-secondary)',
              boxShadow: mode === key ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Existing client ── */}
      {mode === 'existing' && (
        <div>
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients by name or email…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl outline-none"
              style={{
                background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            />
          </div>

          <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid var(--border-subtle)', maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {allUsers.length === 0 ? 'No clients yet — create one first' : 'No matching clients'}
              </div>
            ) : filtered.map(u => (
              <button
                key={u.user_id}
                type="button"
                onClick={() => setSelected(selected?.user_id === u.user_id ? null : u)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{
                  background: selected?.user_id === u.user_id ? 'rgba(245,158,11,0.1)' : 'transparent',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
                onMouseEnter={e => { if (selected?.user_id !== u.user_id) e.currentTarget.style.background = 'var(--bg-elevated)' }}
                onMouseLeave={e => { if (selected?.user_id !== u.user_id) e.currentTarget.style.background = 'transparent' }}
              >
                <Avatar name={u.user_name} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{clientDisplayName(u)}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{u.user_email_id || u.user_phone_number || '—'}</p>
                </div>
                {selected?.user_id === u.user_id && (
                  <CheckCircle2 size={15} className="text-gold-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {selected && (
            <div className="mb-4">
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
                Access expires (optional — leave empty for no expiry)
              </label>
              <input
                type="date"
                value={accessExpires}
                onChange={e => setAccessExpires(e.target.value)}
                className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                style={{
                  background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                }}
              />
            </div>
          )}

          <div className="flex gap-3">
            <GoldButton
              onClick={handleAssignExisting}
              loading={assigning}
              disabled={!selected}
              className="flex-1"
            >
              {selected ? `Assign ${selected.user_name}` : 'Select a client above'}
            </GoldButton>
            <GoldButton variant="ghost" onClick={handleClose}>Cancel</GoldButton>
          </div>
        </div>
      )}

      {/* ── New client ── */}
      {mode === 'new' && (
        <form onSubmit={handleCreateNew}>
          <GoldInput label="Login Username *" name="username" value={newClient.username}
            onChange={e => updateNewClient('username', e.target.value)} />
          <GoldInput label="Password *" name="password" type="password" value={newClient.password}
            onChange={e => setNewClient(f => ({ ...f, password: e.target.value }))} />

          <div className="mb-4">
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Access expires (optional)
            </label>
            <input
              type="date"
              value={accessExpires}
              onChange={e => setAccessExpires(e.target.value)}
              className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
              style={{
                background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
              }}
            />
          </div>

          {duplicates && duplicates.length > 0 && (
            <div className="mb-4 rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {duplicates.length === 1 ? 'A client with this username already exists' : `${duplicates.length} clients with this username already exist`} — assign one instead, or create a new client anyway.
                </p>
              </div>
              <div className="space-y-1.5 mb-3">
                {duplicates.map(u => (
                  <div key={u.user_id} className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-surface)' }}>
                    <Avatar name={u.user_name} size="xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{clientDisplayName(u)}</p>
                      <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{u.user_email_id || u.user_phone_number || '—'}</p>
                    </div>
                    <button
                      type="button"
                      disabled={assigning}
                      onClick={() => assignDuplicateInstead(u)}
                      className="text-xs font-semibold rounded-lg px-2.5 py-1.5 disabled:opacity-50 flex-shrink-0"
                      style={{ background: 'var(--accent-muted)', color: '#F59E0B' }}
                    >
                      Use this client
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <GoldButton type="submit" variant="outline" loading={creating} className="flex-1 justify-center">
                  Create new client anyway
                </GoldButton>
                <GoldButton type="button" variant="ghost" onClick={handleClose}>Cancel</GoldButton>
              </div>
            </div>
          )}

          {(!duplicates || duplicates.length === 0) && (
            <div className="flex gap-3 pt-1">
              <GoldButton type="submit" loading={creating || checkingDuplicates} className="flex-1">Create &amp; Add to Event</GoldButton>
              <GoldButton type="button" variant="ghost" onClick={handleClose}>Cancel</GoldButton>
            </div>
          )}
        </form>
      )}
    </Modal>
  )
}

/* ── Main page ───────────────────────────────────────────── */
export default function StudioEventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const containerRef = useRef(null)
  const [tab, setTab] = useState('Photo Selection')
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [mediaPage, setMediaPage] = useState(1)
  const [mediaStatus, setMediaStatus] = useState('active')
  const [showRevoked, setShowRevoked] = useState(false)
  const [dlProgress, setDlProgress] = useState(null) // { label, percent, speedMBps, etaSec }
  const [publishing, setPublishing] = useState(false)

  const isGalleryTab = tab === 'Photo Selection' || tab === 'AI Media'
  const galleryType = tab === 'AI Media' ? 'AI_MEDIA' : 'PHOTO_SELECTION'

  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEventById(id)
  })
  const { data: mediaData, isLoading: mediaLoading, refetch: refetchMedia } = useQuery({
    queryKey: ['event-media', id, mediaPage, mediaStatus, galleryType],
    queryFn: () => getMediaByEvent(id, { page: mediaPage, limit: 30, status: mediaStatus, gallery: galleryType }),
    // Pre-signed S3 URLs expire after ~30s — refetch ahead of that while this tab is visible.
    refetchInterval: isGalleryTab ? 25_000 : false,
  })
  const { data: guestsData, isLoading: guestsLoading } = useQuery({
    queryKey: ['event-guests', id],
    queryFn: () => getGuestsByEvent(id),
    enabled: tab === 'AI Media' && !!eventData?.data?.is_ai_event
  })
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['event-users', id],
    queryFn: () => getEventUsers(id),
    enabled: tab === 'Clients'
  })
  const { data: favsData, isLoading: favsLoading } = useQuery({
    queryKey: ['event-favs', id],
    queryFn: () => getEventFavouritesGrouped(id),
    enabled: tab === 'Favourites',
    refetchInterval: tab === 'Favourites' ? 25_000 : false,
  })
  const { data: tenantFavsData } = useQuery({
    queryKey: ['event-tenant-favs', id],
    queryFn: () => getTenantFavouritesForEvent(id),
    enabled: tab === 'Favourites',
    refetchInterval: tab === 'Favourites' ? 25_000 : false,
  })
  const { data: settingsData } = useQuery({
    queryKey: ['tenant-settings', user?.tenant_id],
    queryFn: () => getTenantSettings(user?.tenant_id),
    enabled: !!user?.tenant_id
  })

  const watermarkSrc = settingsData?.data?.tenant_watermark_path
    ? backendAssetUrl(settingsData.data.tenant_watermark_path)
    : null

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.event-header', { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' })
      gsap.fromTo('.event-tabs', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, delay: 0.2, ease: 'power3.out' })
    }, containerRef)
    return () => ctx.revert()
  }, [eventData])

  const event = eventData?.data
  const mediaList = mediaData?.data?.items || []
  const totalMediaCount = mediaData?.data?.total || 0
  const allMappings = usersData?.data || []
  const favsGrouped = favsData?.data || []
  const tenantFavs = tenantFavsData?.data || []

  // "Revoked" reflects access to THIS event only (EventUserMapping.isactive) —
  // it never touches the client's login or their access to other events.
  const activeClients = allMappings.filter(m => m.isactive)
  const revokedClients = allMappings.filter(m => !m.isactive)

  const handleUpdateAccess = async (mappingId, data) => {
    try {
      await updateEventUserMapping(mappingId, data)
      qc.invalidateQueries(['event-users', id])
    } catch (err) {
      throw typeof err === 'string' ? err : 'Failed'
    }
  }

  const handleRevokeToggle = async (mappingId, restore, userName) => {
    const action = restore ? 'Restore' : 'Revoke'
    const ok = await confirmDialog({
      title: `${action} access?`,
      message: `${action} "${userName}"'s access to this event? Their login and other events are unaffected.`,
      confirmLabel: action,
      danger: !restore,
    })
    if (!ok) return
    try {
      await updateEventUserMapping(mappingId, { isactive: restore })
      toast.success(`Access to this event ${restore ? 'restored' : 'revoked'}`)
      qc.invalidateQueries(['event-users', id])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to update access') }
  }

  const handleHardDeleteMapping = async (mappingId, userName) => {
    const ok = await confirmDialog({
      title: 'Remove from event?',
      message: `Permanently remove "${userName}" from this event? Their account and other events are unaffected. This cannot be undone.`,
      confirmLabel: 'Remove',
      danger: true,
    })
    if (!ok) return
    try {
      await hardDeleteUserFromEvent(mappingId)
      toast.success('Client removed from this event')
      qc.invalidateQueries(['event-users', id])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to remove client') }
  }

  const handleToggleSubmission = async (mappingId, isSubmitted, userName) => {
    const ok = await confirmDialog({
      title: isSubmitted ? 'Unlock favourites?' : 'Submit favourites?',
      message: isSubmitted
        ? `Unlock "${userName}"'s favourites for editing? They'll be able to change their selection again, and you'll need to have them (or you) submit again when done.`
        : `Submit favourites for "${userName}" now? This locks their current selection as final, as if they submitted it themselves.`,
      confirmLabel: isSubmitted ? 'Unlock' : 'Submit',
      danger: false,
    })
    if (!ok) return
    try {
      await updateEventUserMapping(mappingId, { favourites_submitted: !isSubmitted })
      toast.success(isSubmitted ? 'Unlocked for editing' : 'Submitted on behalf of client')
      qc.invalidateQueries(['event-users', id])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to update submission state') }
  }

  const handleDeleteMedia = async (mediaId, mediaName) => {
    const ok = await confirmDialog({
      title: 'Archive file?',
      message: `Archive "${mediaName || 'this file'}"? It will be hidden from clients.`,
      confirmLabel: 'Archive',
      danger: false,
    })
    if (!ok) return
    try {
      await deleteMedia(mediaId)
      toast.success('File archived')
      refetchMedia()
      qc.invalidateQueries(['event-media', id])
    } catch { toast.error('Failed to archive file') }
  }

  const handleRestoreMedia = async (mediaId, mediaName) => {
    try {
      await restoreMedia(mediaId)
      toast.success(`"${mediaName || 'File'}" restored`)
      refetchMedia()
      qc.invalidateQueries(['event-media', id])
    } catch { toast.error('Failed to restore file') }
  }

  const handleHardDeleteMedia = async (mediaId, mediaName) => {
    const ok = await confirmDialog({
      title: 'Delete permanently?',
      message: `Permanently delete "${mediaName || 'this file'}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    try {
      await hardDeleteMedia(mediaId)
      toast.success('File permanently deleted')
      refetchMedia()
      qc.invalidateQueries(['event-media', id])
    } catch { toast.error('Failed to permanently delete file') }
  }

  // Copying doesn't re-upload — the destination gallery just gets a second
  // row pointing at the same stored file.
  const handleCopyMedia = async (mediaId, mediaName) => {
    const target = galleryType === 'AI_MEDIA' ? 'PHOTO_SELECTION' : 'AI_MEDIA'
    try {
      const res = await copyMediaToGallery(mediaId, target)
      toast.success(res?.message || `Copied "${mediaName || 'file'}"`)
      qc.invalidateQueries(['event-media', id])
    } catch (err) {
      toast.error(err === 'Already Copied.' ? 'Already Copied.' : (typeof err === 'string' ? err : 'Failed to copy'))
    }
  }

  const handlePublish = async () => {
    const ok = await confirmDialog({
      title: 'Publish event?',
      message: 'Publish this event? This marks uploads as finished.',
      confirmLabel: 'Publish',
      danger: false,
    })
    if (!ok) return
    setPublishing(true)
    try {
      await publishEvent(id)
      toast.success('Event published!')
      qc.invalidateQueries(['event', id])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed to publish event') }
    finally { setPublishing(false) }
  }

  const sanitizeForFilename = (name) =>
    (name || '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')

  const handleDownloadZip = async (userId, userName) => {
    const eventName = sanitizeForFilename(event?.event_name)
    const clientName = sanitizeForFilename(userName)
    const filename = `${eventName}_(${clientName}).zip`
    setDlProgress({ label: `${clientName}.zip`, percent: 0, speedMBps: 0, etaSec: null, loaded: 0, total: 0 })
    try {
      await downloadFavouritesZip(id, userId, filename, (p) => setDlProgress(d => ({ ...d, ...p })))
      toast.success('Download started!')
    } catch (err) {
      toast.error('Failed to download zip')
      console.error(err)
    } finally {
      setTimeout(() => setDlProgress(null), 800)
    }
  }

  const handleStudioDownloadZip = async () => {
    const eventName = sanitizeForFilename(event?.event_name)
    const studioName = sanitizeForFilename(event?.tenant_studio_name || user?.tenant_studio_name || 'Studio')
    const filename = `${eventName}_(${studioName}_Favourites).zip`
    setDlProgress({ label: `${studioName}_Favourites.zip`, percent: 0, speedMBps: 0, etaSec: null, loaded: 0, total: 0 })
    try {
      await downloadStudioFavouritesZip(id, filename, (p) => setDlProgress(d => ({ ...d, ...p })))
      toast.success('Download started!')
    } catch (err) {
      toast.error('Failed to download studio zip')
      console.error(err)
    } finally {
      setTimeout(() => setDlProgress(null), 800)
    }
  }

  if (eventLoading) return <AppLayout><SkeletonLoader type="page" /></AppLayout>

  return (
    <AppLayout
      title={event?.event_name || 'Event'}
      subtitle={[formatDate(event?.event_date), event?.event_venue].filter(Boolean).join(' · ')}
    >
      {/* Download progress overlay */}
      {dlProgress && (() => {
        const hasTotal = dlProgress.total > 0
        const pct = hasTotal ? Math.round((dlProgress.loaded / dlProgress.total) * 100) : 0
        const loadedMB = dlProgress.loaded ? (dlProgress.loaded / 1024 / 1024).toFixed(1) : '0'
        const totalMB = hasTotal ? (dlProgress.total / 1024 / 1024).toFixed(1) : null
        const speedStr = dlProgress.speedMBps > 0 ? `${dlProgress.speedMBps.toFixed(1)} MB/s` : 'Connecting...'
        const etaStr = dlProgress.etaSec != null ? ` · ${dlProgress.etaSec}s left` : ''
        const statusLine = hasTotal
          ? `${pct}% · ${speedStr}${etaStr}`
          : `${loadedMB} MB downloaded · ${speedStr}`
        return (
          <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl p-4 shadow-2xl"
            style={{ background: '#18181b', border: '1px solid rgba(212,175,55,0.3)' }}>
            <style>{`
              @keyframes dlIndeterminate {
                0%   { transform: translateX(-100%); }
                100% { transform: translateX(400%); }
              }
            `}</style>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(212,175,55,0.15)' }}>
                <Download size={14} className="text-gold-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: '#f5f5f5' }}>
                  {dlProgress.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#a1a1aa' }}>
                  {statusLine}
                  {totalMB && <span> / {totalMB} MB</span>}
                </p>
              </div>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#3f3f46' }}>
              {hasTotal ? (
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #B8860B, #D4AF37, #FFD700)' }} />
              ) : (
                <div className="h-full w-1/3 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #B8860B, #FFD700)',
                    animation: 'dlIndeterminate 1.4s ease-in-out infinite',
                  }} />
              )}
            </div>
          </div>
        )
      })()}

      <div ref={containerRef}>
        {/* Header */}
        <div className="event-header mb-6">
          <button onClick={() => navigate('/studio')}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-gold-500 transition-colors mb-4">
            <ArrowLeft size={14} /> Back to Events
          </button>

          {/* Hero banner */}
          <div className="relative rounded-2xl overflow-hidden mb-6"
            style={{ height: 280, background: 'var(--bg-elevated)' }}>
            {event?.profile_url && (
              <img src={backendAssetUrl(event.profile_url)} alt={event.event_name}
                className="absolute inset-0 w-full h-full object-cover" />
            )}
            {!event?.profile_url && (
              <div className="absolute inset-0 flex items-center justify-center">
                <h1 className="font-display italic text-4xl text-center px-8" style={{ color: 'var(--text-tertiary)' }}>
                  {event?.event_name}
                </h1>
              </div>
            )}
            <div className="absolute inset-0" style={{ background: 'var(--gradient-image-fade)' }} />
            <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
              <div>
                <h1 className="font-display text-2xl font-semibold text-white">{event?.event_name}</h1>
                <p className="text-sm text-white/70">
                  {formatDate(event?.event_date)}{event?.event_venue && ` · ${event.event_venue}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {event?.is_ai_event && <Badge variant="gold"><Sparkles size={10} className="inline mr-1" />AI Media</Badge>}
                <Badge variant={event?.published_at ? 'success' : 'default'}>{event?.published_at ? 'Published' : 'Unpublished'}</Badge>
                <Badge variant="gold">{event?.isactive ? 'Active' : 'Archived'}</Badge>
              </div>
            </div>
          </div>

          {!event?.published_at && (
            <div className="flex justify-end mb-4">
              <GoldButton size="sm" icon={<Rocket size={13} />} loading={publishing} onClick={handlePublish}>
                Publish Event
              </GoldButton>
            </div>
          )}

          {/* Tabs */}
          <div className="event-tabs flex items-center gap-1 border-b" style={{ borderColor: 'var(--border-default)' }}>
            {(event?.is_ai_event ? [BASE_TABS[0], 'AI Media', ...BASE_TABS.slice(1)] : BASE_TABS).map(t => (
              <button key={t} onClick={() => { setTab(t); setMediaPage(1) }}
                className={`px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px
                  ${tab === t
                    ? 'border-gold-500 text-gold-500'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}>
                {t}
                {t === 'Clients' && allMappings.length > 0 && (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: tab === 'Clients' ? 'rgba(245,158,11,0.2)' : 'var(--bg-elevated)', color: tab === 'Clients' ? '#F59E0B' : 'var(--text-tertiary)' }}>
                    {activeClients.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab: AI Media — QR code + registered guests, on top of its own gallery */}
        {tab === 'AI Media' && event?.is_ai_event && (
          <div className="mb-6">
            <GlassCard hover={false} className="mb-5">
              <div className="flex flex-wrap items-start gap-6">
                <div className="flex-shrink-0">
                  <EventQrCode eventId={id} />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-1" style={{ color: 'var(--text-primary)' }}>
                    <QrCode size={14} className="text-gold-500" /> Guest Registration
                  </h3>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                    Print this QR code at the entrance or on tables. Guests scan it, upload a selfie, and leave their
                    email — they'll get their matched photos once you publish the event.
                  </p>
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Mail size={13} />
                    {guestsLoading ? 'Loading guests…' : `${guestsData?.data?.length || 0} guest${(guestsData?.data?.length || 0) === 1 ? '' : 's'} registered`}
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Tab: Photo Selection / AI Media gallery */}
        {isGalleryTab && (
          <div>
            {/* File summary */}
            {totalMediaCount > 0 && (
              <div className="flex flex-wrap items-center gap-4 mb-5 px-4 py-3 rounded-xl"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <HardDrive size={14} className="text-gold-500 flex-shrink-0" />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{totalMediaCount}</span> files
                </span>
              </div>
            )}
            <div className="mb-6">
              <UploadDropzone
                eventId={id}
                galleryType={galleryType}
                onComplete={() => { refetchMedia(); qc.invalidateQueries(['event-media', id]); qc.invalidateQueries(['tenant-subscription']) }}
              />
            </div>

            <div className="flex gap-1 p-1 rounded-xl mb-5 w-fit" style={{ background: 'var(--bg-elevated)' }}>
              {[
                { key: 'active', label: 'Active' },
                { key: 'archived', label: 'Archived' },
                { key: 'all', label: 'All' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setMediaStatus(key); setMediaPage(1) }}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: mediaStatus === key ? 'var(--bg-surface)' : 'transparent',
                    color: mediaStatus === key ? '#F59E0B' : 'var(--text-secondary)',
                    boxShadow: mediaStatus === key ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <PhotoGrid
              mediaList={mediaList}
              eventId={id}
              watermarkSrc={watermarkSrc}
              loading={mediaLoading}
              showFavourite={false}
              showTenantFav={true}
              onDelete={handleDeleteMedia}
              onRestore={handleRestoreMedia}
              onHardDelete={handleHardDeleteMedia}
              onCopyToOtherGallery={event?.is_ai_event ? handleCopyMedia : undefined}
              copyLabel={galleryType === 'AI_MEDIA' ? 'Copy to Photo Selection' : 'Copy to AI Media'}
            />
          </div>
        )}

        {/* Tab: Clients */}
        {tab === 'Clients' && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {activeClients.length} active {activeClients.length === 1 ? 'client' : 'clients'}
                </p>
                {revokedClients.length > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    + {revokedClients.length} with revoked access
                  </p>
                )}
              </div>
              <GoldButton size="sm" icon={<UserPlus size={13} />} onClick={() => setAddClientOpen(true)}>
                Add Client
              </GoldButton>
            </div>

            {usersLoading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}</div>
            ) : allMappings.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--accent-muted)' }}>
                  <Users size={24} className="text-gold-500" />
                </div>
                <div>
                  <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No clients yet</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Add existing clients or create new ones for this event
                  </p>
                </div>
                <GoldButton size="sm" onClick={() => setAddClientOpen(true)}>+ Add First Client</GoldButton>
              </div>
            ) : (
              <>
                {/* Active clients */}
                {activeClients.length > 0 && (
                  <GlassCard hover={false} className="p-0 overflow-hidden mb-4">
                    {activeClients.map(mapping => (
                      <ClientRow
                        key={mapping.event_user_id}
                        mapping={mapping}
                        onUpdate={handleUpdateAccess}
                        onRevokeToggle={handleRevokeToggle}
                        onHardDelete={handleHardDeleteMapping}
                        onToggleSubmission={handleToggleSubmission}
                      />
                    ))}
                  </GlassCard>
                )}

                {/* Revoked clients toggle */}
                {revokedClients.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowRevoked(r => !r)}
                      className="flex items-center gap-2 text-xs mb-3 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                    >
                      {showRevoked ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {showRevoked ? 'Hide' : 'Show'} {revokedClients.length} revoked {revokedClients.length === 1 ? 'client' : 'clients'}
                    </button>
                    {showRevoked && (
                      <GlassCard hover={false} className="p-0 overflow-hidden">
                        {revokedClients.map(mapping => (
                          <ClientRow
                            key={mapping.event_user_id}
                            mapping={mapping}
                            onUpdate={handleUpdateAccess}
                            onRevokeToggle={handleRevokeToggle}
                            onHardDelete={handleHardDeleteMapping}
                            onToggleSubmission={handleToggleSubmission}
                          />
                        ))}
                      </GlassCard>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab: Favourites */}
        {tab === 'Favourites' && (
          <FavouritesGallery
            eventId={id}
            favsGrouped={favsGrouped}
            tenantFavs={tenantFavs}
            tenantLabel={event?.tenant_studio_name || user?.tenant_studio_name || 'Studio (You)'}
            loading={favsLoading}
            watermarkSrc={watermarkSrc}
            onDownloadZip={handleDownloadZip}
            onStudioDownloadZip={handleStudioDownloadZip}
          />
        )}
      </div>

      <AddClientModal
        open={addClientOpen}
        onClose={() => setAddClientOpen(false)}
        eventId={id}
        qc={qc}
      />
    </AppLayout>
  )
}
