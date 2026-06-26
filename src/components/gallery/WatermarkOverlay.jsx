import React from 'react'

export default function WatermarkOverlay({ src, size = 'md' }) {
  const sizes = { sm: 'w-16 opacity-25', md: 'w-24 opacity-30', lg: 'w-32 opacity-35' }

  if (!src) return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none`}>
      <span className={`font-display italic text-white/20 ${size === 'lg' ? 'text-2xl' : 'text-sm'} no-select`}>
        Webzspot Studio
      </span>
    </div>
  )

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
      <img
        src={src}
        alt=""
        className={`${sizes[size]} no-select`}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  )
}
