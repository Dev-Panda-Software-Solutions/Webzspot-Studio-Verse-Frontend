import React from 'react'

export default function WatermarkOverlay({ src, size = 'md' }) {
  const sizes = { sm: 'w-16 opacity-25', md: 'w-24 opacity-30', lg: 'w-32 opacity-35' }

  // z-index + translateZ force the overlay into its own compositing layer. Without
  // this, browsers can paint native <video> content (especially on mobile Safari)
  // above sibling overlays, leaving videos without a watermark.
  const overlayStyle = {
    zIndex: 5,
    transform: 'translateZ(0)',
    willChange: 'transform',
  }

  if (!src) return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={overlayStyle}>
      <span
        className={`font-display italic text-white/20 ${size === 'lg' ? 'text-2xl' : 'text-sm'} no-select`}
        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
      >
        Webzspot Studio
      </span>
    </div>
  )

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={overlayStyle}>
      <img
        src={src}
        alt=""
        className={`${sizes[size]} no-select`}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.45))', transform: 'translateZ(0)' }}
      />
    </div>
  )
}
