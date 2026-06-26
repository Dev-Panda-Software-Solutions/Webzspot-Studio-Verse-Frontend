import React, { useLayoutEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Users, UserPlus, UserCheck,
  Calendar, Ban, CheckCircle2, ChevronDown, ChevronUp, Search
} from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import GoldButton from '../../components/ui/GoldButton'
import GlassCard from '../../components/ui/GlassCard'
import PhotoGrid from '../../components/gallery/PhotoGrid'
import UploadDropzone from '../../components/upload/UploadDropzone'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import Modal from '../../components/ui/Modal'
import GoldInput from '../../components/ui/GoldInput'
import PasswordStrength from '../../components/ui/PasswordStrength'
import { getEventById, getEventFavouritesGrouped, getEventUsers, assignUserToEvent, updateEventUserMapping } from '../../api/events'
import { getMediaByEvent } from '../../api/media'
import { createUserInEvent, getUsers } from '../../api/users'
import { downloadFavouritesZip } from '../../api/media'
import { getTenantSettings } from '../../api/tenants'
import { getTenantFavouritesForEvent } from '../../api/favourites'
import { formatDate } from '../../utils/formatters'
import useAuthStore from '../../stores/authStore'
import FavouritesGallery from '../../components/gallery/FavouritesGallery'
import { backendAssetUrl } from '../../utils/apiUrl'
import toast from 'react-hot-toast'

const TABS = ['Media', 'Clients', 'Favourites']

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
function AccessPanel({ mapping, onUpdate, onRevoke }) {
  const [open, setOpen] = useState(false)
  const [newExpiry, setNewExpiry] = useState(
    mapping.access_expires ? new Date(mapping.access_expires).toISOString().split('T')[0] : ''
  )
  const [saving, setSaving] = useState(false)

  const handleExtend = async () => {
    setSaving(true)
    try {
      await onUpdate(mapping.event_user_id, { access_expires: newExpiry || null })
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
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>

      {open && (
        <div className="mt-2 p-3 rounded-xl flex items-end gap-2"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex-1">
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
          <GoldButton size="sm" onClick={handleExtend} loading={saving}>Save</GoldButton>
        </div>
      )}
    </div>
  )
}

/* ── Client row ──────────────────────────────────────────── */
function ClientRow({ mapping, onUpdate, onRevoke }) {
  const u = mapping.user
  return (
    <div className="flex items-start gap-4 px-5 py-4 border-b group transition-colors"
      style={{ borderColor: 'var(--border-subtle)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <Avatar name={u.user_name} size="sm" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.user_name}</p>
          <AccessBadge access_expires={mapping.access_expires} isactive={mapping.isactive} />
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {u.user_email_id || u.user_phone_number || '—'}
        </p>
        <div className="mt-1.5">
          <AccessPanel mapping={mapping} onUpdate={onUpdate} onRevoke={onRevoke} />
        </div>
      </div>

      {/* Revoke / restore toggle */}
      <button
        onClick={() => onRevoke(mapping.event_user_id, !mapping.isactive)}
        className="flex-shrink-0 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        style={{ color: mapping.isactive ? 'var(--text-tertiary)' : '#34D399' }}
        title={mapping.isactive ? 'Revoke access' : 'Restore access'}
        onMouseEnter={e => e.currentTarget.style.color = mapping.isactive ? '#F87171' : '#34D399'}
        onMouseLeave={e => e.currentTarget.style.color = mapping.isactive ? 'var(--text-tertiary)' : '#34D399'}
      >
        {mapping.isactive ? <Ban size={14} /> : <CheckCircle2 size={14} />}
      </button>
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
  const [newClient, setNewClient] = useState({ user_name: '', username: '', password: '', user_email_id: '', user_phone_number: '' })
  const [creating, setCreating] = useState(false)

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
    setNewClient({ user_name: '', username: '', password: '', user_email_id: '', user_phone_number: '' })
  }

  const handleClose = () => { reset(); onClose() }

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

  const handleCreateNew = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await createUserInEvent({
        ...newClient,
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
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{u.user_name}</p>
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
          <GoldInput label="Full Name *" name="user_name" value={newClient.user_name}
            onChange={e => setNewClient(f => ({ ...f, user_name: e.target.value }))} />
          <GoldInput label="Email" name="user_email_id" type="email" value={newClient.user_email_id}
            onChange={e => setNewClient(f => ({ ...f, user_email_id: e.target.value }))} />
          <GoldInput label="Phone" name="user_phone_number" value={newClient.user_phone_number}
            onChange={e => setNewClient(f => ({ ...f, user_phone_number: e.target.value }))} />
          <GoldInput label="Login Username *" name="username" value={newClient.username}
            onChange={e => setNewClient(f => ({ ...f, username: e.target.value }))} />
          <GoldInput label="Password *" name="password" type="password" value={newClient.password}
            onChange={e => setNewClient(f => ({ ...f, password: e.target.value }))} />
          <PasswordStrength value={newClient.password} />

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

          <div className="flex gap-3 pt-1">
            <GoldButton type="submit" loading={creating} className="flex-1">Create &amp; Add to Event</GoldButton>
            <GoldButton type="button" variant="ghost" onClick={handleClose}>Cancel</GoldButton>
          </div>
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
  const [tab, setTab] = useState('Media')
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [mediaPage, setMediaPage] = useState(1)
  const [showRevoked, setShowRevoked] = useState(false)

  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEventById(id)
  })
  const { data: mediaData, isLoading: mediaLoading, refetch: refetchMedia } = useQuery({
    queryKey: ['event-media', id, mediaPage],
    queryFn: () => getMediaByEvent(id, { page: mediaPage, limit: 30 })
  })
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['event-users', id],
    queryFn: () => getEventUsers(id),
    enabled: tab === 'Clients'
  })
  const { data: favsData, isLoading: favsLoading } = useQuery({
    queryKey: ['event-favs', id],
    queryFn: () => getEventFavouritesGrouped(id),
    enabled: tab === 'Favourites'
  })
  const { data: tenantFavsData } = useQuery({
    queryKey: ['event-tenant-favs', id],
    queryFn: () => getTenantFavouritesForEvent(id),
    enabled: tab === 'Favourites'
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
  const allMappings = usersData?.data || []
  const favsGrouped = favsData?.data || []
  const tenantFavs = tenantFavsData?.data || []

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

  const handleRevokeToggle = async (mappingId, restore) => {
    const action = restore ? 'Restore' : 'Revoke'
    if (!window.confirm(`${action} this client's access?`)) return
    try {
      await updateEventUserMapping(mappingId, { isactive: restore })
      toast.success(`Access ${restore ? 'restored' : 'revoked'}`)
      qc.invalidateQueries(['event-users', id])
    } catch { toast.error('Failed to update access') }
  }

  const handleDownloadZip = (userId) => {
    window.open(downloadFavouritesZip(id, userId), '_blank')
  }

  if (eventLoading) return <AppLayout><SkeletonLoader type="page" /></AppLayout>

  return (
    <AppLayout
      title={event?.event_name || 'Event'}
      subtitle={[formatDate(event?.event_date), event?.event_venue].filter(Boolean).join(' · ')}
    >
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
              <Badge variant="gold">{event?.isactive ? 'Active' : 'Archived'}</Badge>
            </div>
          </div>

          {/* Tabs */}
          <div className="event-tabs flex items-center gap-1 border-b" style={{ borderColor: 'var(--border-default)' }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
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

        {/* Tab: Media */}
        {tab === 'Media' && (
          <div>
            <div className="mb-6">
              <UploadDropzone eventId={id} onComplete={() => { refetchMedia(); qc.invalidateQueries(['event-media', id]) }} />
            </div>
            <PhotoGrid
              mediaList={mediaList}
              eventId={id}
              watermarkSrc={watermarkSrc}
              loading={mediaLoading}
              showFavourite={false}
              showTenantFav={true}
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
                        onRevoke={handleRevokeToggle}
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
                            onRevoke={handleRevokeToggle}
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
