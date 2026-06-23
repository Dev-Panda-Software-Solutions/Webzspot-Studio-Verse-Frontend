import React from 'react'
import { getInitials } from '../../utils/formatters'

export default function Avatar({ name = '', src, size = 'md', ring = false }) {
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  }

  return (
    <div className={`
      ${sizes[size]} rounded-full flex items-center justify-center font-semibold
      overflow-hidden flex-shrink-0
      ${ring ? 'ring-2 ring-gold-500 ring-offset-2 ring-offset-[var(--bg-base)]' : ''}
    `}
      style={{ background: src ? 'transparent' : 'var(--accent-muted)', color: 'var(--accent-primary)' }}
    >
      {src
        ? <img src={src} alt={name} className="w-full h-full object-cover" />
        : <span>{getInitials(name)}</span>
      }
    </div>
  )
}
