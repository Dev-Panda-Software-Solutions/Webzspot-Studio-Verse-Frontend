import React from 'react'

export default function GlassCard({ children, className = '', hover = true, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`
        glass rounded-xl p-6
        ${hover ? 'hover:border-[rgba(245,158,11,0.3)] hover:shadow-elevated cursor-pointer transition-all duration-200' : ''}
        ${className}
      `}
      style={{ background: 'var(--gradient-glass)' }}
    >
      {children}
    </div>
  )
}
