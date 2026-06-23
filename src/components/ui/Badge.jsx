import React from 'react'

const variants = {
  gold: 'bg-[var(--accent-muted)] text-gold-500 border border-[rgba(245,158,11,0.3)]',
  success: 'bg-[var(--success-muted)] text-green-400 border border-[rgba(16,185,129,0.3)]',
  error: 'bg-[var(--error-muted)] text-red-400 border border-[rgba(239,68,68,0.3)]',
  info: 'bg-[var(--info-muted)] text-blue-400 border border-[rgba(59,130,246,0.3)]',
  default: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-default)]',
}

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
