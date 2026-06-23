import React from 'react'
import { LayoutDashboard, Grid2X2, List, ZoomIn, ZoomOut } from 'lucide-react'

const VIEWS = [
  { key: 'masonry', icon: LayoutDashboard, label: 'Masonry' },
  { key: 'grid',    icon: Grid2X2,        label: 'Grid'    },
  { key: 'list',    icon: List,           label: 'List'    },
]

export default function GalleryControls({ view, onView, zoom, onZoom, count }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* View switcher */}
      <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        {VIEWS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => onView(key)}
            title={label}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
              view === key
                ? 'text-[var(--bg-base)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            style={view === key ? { background: 'var(--accent-primary)' } : {}}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Zoom slider */}
      {view !== 'list' && (
        <div className="flex items-center gap-2">
          <ZoomOut size={13} style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="range"
            min={0}
            max={9}
            step={1}
            value={zoom}
            onChange={e => onZoom(Number(e.target.value))}
            className="gallery-zoom-slider"
            style={{ width: 90 }}
          />
          <ZoomIn size={13} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)', minWidth: 28 }}>
            {count}×
          </span>
        </div>
      )}
    </div>
  )
}
