import React, { useState } from 'react'
import { Download, Heart, Building2, User, Layers } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import PhotoCard from './PhotoCard'
import LightboxViewer from './LightboxViewer'
import GalleryControls from './GalleryControls'
import Avatar from '../ui/Avatar'
import GoldButton from '../ui/GoldButton'
import SkeletonLoader from '../ui/SkeletonLoader'

const MASONRY_COLS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
const GRID_COLS    = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]

const estimateZipSize = (items) => {
  let totalKb = 0
  for (const m of items) {
    const kb = parseFloat(m?.original_size || m?.media_size)
    if (!isNaN(kb)) totalKb += kb
  }
  if (totalKb === 0) return null
  return totalKb >= 1024
    ? `~${(totalKb / 1024).toFixed(1)} MB`
    : `~${Math.round(totalKb)} KB`
}

/* ─── Filter chip ─── */
function Chip({ label, icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border"
      style={{
        background: active ? 'var(--accent-primary)' : 'var(--bg-elevated)',
        borderColor: active ? 'var(--accent-primary)' : 'var(--border-default)',
        color: active ? 'var(--bg-base)' : 'var(--text-secondary)',
      }}
    >
      {Icon && <Icon size={11} />}
      {label}
    </button>
  )
}

/* ─── Who-fav badge strip on top of a card ─── */
function OwnerBadges({ labels }) {
  if (labels.length < 2) return null
  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex gap-1 flex-wrap p-1.5 pointer-events-none z-10 rounded-b-lg"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 60%, transparent)' }}
    >
      {labels.map(label => (
        <span
          key={label}
          className="text-[9px] px-1.5 py-0.5 rounded font-semibold leading-none"
          style={{ background: 'var(--accent-primary)', color: '#000' }}
        >
          {label.length > 8 ? label.slice(0, 7) + '…' : label}
        </span>
      ))}
    </div>
  )
}

/* ─── Shared grid renderer ─── */
function MediaGrid({ items, view, zoom, eventId, watermarkSrc, onClickItem }) {
  const mCols = MASONRY_COLS[zoom]
  const gCols = GRID_COLS[zoom]

  if (view === 'masonry') {
    return (
      <div style={{ columns: mCols, columnGap: 12 }}>
        {items.map(({ media, labels }, idx) => (
          <div key={media.media_id} className="relative break-inside-avoid mb-3">
            <PhotoCard
              media={media}
              eventId={eventId}
              watermarkSrc={watermarkSrc}
              showFavourite={false}
              showTenantFav={false}
              view="masonry"
              onClick={() => onClickItem(idx)}
            />
            {labels && <OwnerBadges labels={labels} />}
          </div>
        ))}
      </div>
    )
  }

  if (view === 'list') {
    return (
      <div className="flex flex-col gap-2">
        {items.map(({ media, labels }, idx) => (
          <div key={media.media_id} className="relative">
            <PhotoCard
              media={media}
              eventId={eventId}
              watermarkSrc={watermarkSrc}
              showFavourite={false}
              showTenantFav={false}
              view="list"
              onClick={() => onClickItem(idx)}
            />
            {labels && <OwnerBadges labels={labels} />}
          </div>
        ))}
      </div>
    )
  }

  // grid (default)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gCols}, 1fr)`, gap: 10 }}>
      {items.map(({ media, labels }, idx) => (
        <div key={media.media_id} className="relative">
          <PhotoCard
            media={media}
            eventId={eventId}
            watermarkSrc={watermarkSrc}
            showFavourite={false}
            showTenantFav={false}
            view="grid"
            onClick={() => onClickItem(idx)}
          />
          {labels && <OwnerBadges labels={labels} />}
        </div>
      ))}
    </div>
  )
}

/* ─── Deduped grid — shown when 2+ groups selected ─── */
function DedupedGrid({ groups, eventId, watermarkSrc, view, zoom, onDownload, onStudioDownload }) {
  const [lbIndex, setLbIndex] = useState(null)

  const mediaMap = new Map()
  for (const group of groups) {
    for (const media of group.items) {
      if (!mediaMap.has(media.media_id)) {
        mediaMap.set(media.media_id, { media, labels: [] })
      }
      mediaMap.get(media.media_id).labels.push(group.label)
    }
  }
  const items = [...mediaMap.values()]
  const currentEntry = lbIndex !== null ? items[lbIndex] : null
  const current = currentEntry?.media

  return (
    <>
      {/* Per-group download row */}
      <div className="flex flex-wrap gap-2 mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {groups.map(group => {
          const sz = estimateZipSize(group.items)
          return group.isTenant ? (
            <GoldButton key="tenant" size="sm" icon={<Download size={12} />} onClick={onStudioDownload} variant="outline">
              {group.label}{sz ? ` (${sz})` : ''}
            </GoldButton>
          ) : group.userId ? (
            <GoldButton key={group.id} size="sm" icon={<Download size={12} />} onClick={() => onDownload(group.userId, group.label)} variant="outline">
              {group.label}{sz ? ` (${sz})` : ''}
            </GoldButton>
          ) : null
        })}
      </div>

      <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
        {items.length} unique {items.length === 1 ? 'photo' : 'photos'} ·{' '}
        photos with gold badges were favourited by more than one person
      </p>

      <MediaGrid
        items={items}
        view={view}
        zoom={zoom}
        eventId={eventId}
        watermarkSrc={watermarkSrc}
        onClickItem={setLbIndex}
      />

      {current && (
        <LightboxViewer
          media={current}
          index={lbIndex}
          total={items.length}
          eventId={eventId}
          watermarkSrc={watermarkSrc}
          ownerLabels={currentEntry?.labels}
          onClose={() => setLbIndex(null)}
          onPrev={lbIndex > 0 ? () => setLbIndex(i => i - 1) : null}
          onNext={lbIndex < items.length - 1 ? () => setLbIndex(i => i + 1) : null}
        />
      )}
    </>
  )
}

/* ─── Per-group grid — shown when exactly 1 group selected ─── */
function GroupGallery({ group, eventId, watermarkSrc, view, zoom, onDownload, onStudioDownload }) {
  const [lbIndex, setLbIndex] = useState(null)
  const items = group.items.map(m => ({ media: m, labels: null }))
  const current = lbIndex !== null ? items[lbIndex]?.media : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="mb-10"
    >
      {/* Group header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar name={group.label} size="sm" />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {group.label}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {group.items.length} {group.items.length === 1 ? 'photo' : 'photos'} favourited
            </p>
          </div>
        </div>
        {group.userId && (
          <GoldButton size="sm" icon={<Download size={12} />} onClick={() => onDownload(group.userId, group.label)}>
            Download Zip{estimateZipSize(group.items) ? ` (${estimateZipSize(group.items)})` : ''}
          </GoldButton>
        )}
        {group.isTenant && (
          <GoldButton size="sm" icon={<Download size={12} />} onClick={onStudioDownload}>
            Download Zip{estimateZipSize(group.items) ? ` (${estimateZipSize(group.items)})` : ''}
          </GoldButton>
        )}
      </div>

      {group.items.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--text-tertiary)' }}>No favourited photos</p>
      ) : (
        <MediaGrid
          items={items}
          view={view}
          zoom={zoom}
          eventId={eventId}
          watermarkSrc={watermarkSrc}
          onClickItem={setLbIndex}
        />
      )}

      {current && (
        <LightboxViewer
          media={current}
          index={lbIndex}
          total={items.length}
          eventId={eventId}
          watermarkSrc={watermarkSrc}
          ownerLabels={[group.label]}
          onClose={() => setLbIndex(null)}
          onPrev={lbIndex > 0 ? () => setLbIndex(i => i - 1) : null}
          onNext={lbIndex < items.length - 1 ? () => setLbIndex(i => i + 1) : null}
        />
      )}

      <div className="mt-6" style={{ borderBottom: '1px solid var(--border-subtle)' }} />
    </motion.div>
  )
}

/* ─── Main component ─── */
export default function FavouritesGallery({
  eventId,
  favsGrouped = [],
  tenantFavs = [],
  tenantLabel = 'Studio (You)',
  loading,
  watermarkSrc,
  onDownloadZip,
  onStudioDownloadZip,
}) {
  const [selected, setSelected] = useState(new Set(['all']))
  const [view, setView] = useState('grid')
  const [zoom, setZoom] = useState(6)

  const toggleGroup = (id) => {
    setSelected(prev => {
      if (id === 'all') return new Set(['all'])
      const next = new Set(prev)
      next.delete('all')
      if (next.has(id)) {
        next.delete(id)
        if (next.size === 0) return new Set(['all'])
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (loading) return <SkeletonLoader count={3} />

  const tenantItems = tenantFavs.map(f => f.media).filter(Boolean)
  const allGroups = [
    ...(tenantItems.length > 0
      ? [{ id: 'tenant', label: tenantLabel, userId: null, isTenant: true, items: tenantItems, icon: Building2 }]
      : []),
    ...favsGrouped.map(g => ({
      id: g.user?.user_id || g.user_id,
      label: g.user?.user_name || 'Client',
      userId: g.user?.user_id || g.user_id,
      isTenant: false,
      items: (g.favourites || []).map(f => f.media || f),
      icon: User,
    })),
  ]

  const isEmpty = allGroups.length === 0
  const isMultiView = selected.has('all') ? allGroups.length > 1 : selected.size > 1

  const visibleGroups = selected.has('all')
    ? allGroups
    : allGroups.filter(g => selected.has(g.id))

  const mCols = MASONRY_COLS[zoom]
  const gCols = GRID_COLS[zoom]

  return (
    <div>
      {isEmpty ? (
        <div className="py-20 text-center">
          <Heart size={36} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No favourites collected yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Studio can heart photos in the Media tab · Clients heart photos in their gallery
          </p>
        </div>
      ) : (
        <>
          {/* View controls */}
          <div className="mb-5">
            <GalleryControls
              view={view}
              onView={setView}
              zoom={zoom}
              onZoom={setZoom}
              count={view === 'grid' ? gCols : mCols}
            />
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Chip
              label="All"
              icon={Layers}
              active={selected.has('all')}
              onClick={() => toggleGroup('all')}
            />
            {allGroups.map(g => (
              <Chip
                key={g.id}
                label={g.label}
                icon={g.icon}
                active={!selected.has('all') && selected.has(g.id)}
                onClick={() => toggleGroup(g.id)}
              />
            ))}
          </div>

          <AnimatePresence mode="popLayout">
            {isMultiView ? (
              <motion.div
                key="deduped"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <DedupedGrid
                  groups={visibleGroups}
                  eventId={eventId}
                  watermarkSrc={watermarkSrc}
                  view={view}
                  zoom={zoom}
                  onDownload={onDownloadZip}
                  onStudioDownload={onStudioDownloadZip}
                />
              </motion.div>
            ) : (
              visibleGroups.map(group => (
                <GroupGallery
                  key={group.id}
                  group={group}
                  eventId={eventId}
                  watermarkSrc={watermarkSrc}
                  view={view}
                  zoom={zoom}
                  onDownload={onDownloadZip}
                  onStudioDownload={onStudioDownloadZip}
                />
              ))
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}
