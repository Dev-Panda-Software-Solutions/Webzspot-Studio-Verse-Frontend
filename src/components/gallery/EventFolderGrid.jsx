import React from 'react'
import { Folder, Lock, Clock } from 'lucide-react'
import { formatDate } from '../../utils/formatters'

// Google-Drive-style landing view for clients assigned to multiple events —
// pick a folder (event) first, then see its photos, instead of being dropped
// straight into whichever event happened to load first.
export default function EventFolderGrid({ events, onOpen }) {
  return (
    <div>
      <h2 className="font-display text-2xl mb-1" style={{ color: 'var(--text-primary)' }}>Your Events</h2>
      <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
        Select an event to view its photos
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {events.map(ev => {
          const locked = ev._access?.has_current_access === false
          const expiresDate = ev._access?.access_expires ? new Date(ev._access.access_expires) : null
          const daysLeft = expiresDate ? Math.ceil((expiresDate - new Date()) / 86400000) : null
          const expiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 7

          return (
            <button
              key={ev.event_id}
              onClick={() => !locked && onOpen(ev.event_id)}
              disabled={locked}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl text-center transition-all duration-200 ${locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:-translate-y-1'}`}
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="relative">
                <Folder size={56} style={{ color: locked ? 'var(--text-tertiary)' : '#F59E0B' }} fill={locked ? 'none' : 'rgba(245,158,11,0.15)'} />
                {locked && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: '#F87171' }}>
                    <Lock size={12} className="text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0 w-full">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {ev.event_name}
                </p>
                {ev.event_date && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {formatDate(ev.event_date)}
                  </p>
                )}
                {locked ? (
                  <p className="text-xs mt-1.5" style={{ color: '#F87171' }}>Access expired</p>
                ) : expiringSoon ? (
                  <p className="text-xs mt-1.5 flex items-center justify-center gap-1" style={{ color: '#FBBF24' }}>
                    <Clock size={10} /> {daysLeft}d left
                  </p>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
