import React, { useRef } from 'react'
import { gsap } from 'gsap'

export default function GoldButton({
  children, onClick, type = 'button', variant = 'solid',
  size = 'md', loading = false, disabled = false, className = '', icon
}) {
  const btnRef = useRef(null)

  const handleMouseMove = (e) => {
    const el = btnRef.current
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    gsap.to(el, { x: x * 0.12, y: y * 0.12, duration: 0.3, ease: 'power2.out' })
  }
  const handleMouseLeave = () => {
    gsap.to(btnRef.current, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' })
  }
  const handleMouseDown = () => {
    gsap.to(btnRef.current, { scale: 0.96, duration: 0.1 })
  }
  const handleMouseUp = () => {
    gsap.to(btnRef.current, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' })
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3 text-base',
    xl: 'px-9 py-4 text-lg',
  }

  const variants = {
    solid: 'bg-gold-500 hover:bg-gold-400 text-obsidian-base font-semibold shadow-gold hover:shadow-gold-lg',
    outline: 'border border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-obsidian-base',
    ghost: 'text-gold-500 hover:bg-[var(--accent-muted)]',
    danger: 'bg-red-600 hover:bg-red-500 text-white font-semibold',
  }

  return (
    <button
      ref={btnRef}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={`
        relative inline-flex items-center gap-2 rounded-lg font-medium
        transition-all duration-200 overflow-hidden
        disabled:opacity-40 disabled:cursor-not-allowed
        ${sizes[size]} ${variants[variant]} ${className}
      `}
    >
      {/* Shimmer sweep on hover */}
      <span className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-500
        bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
      <span>{loading ? 'Loading...' : children}</span>
    </button>
  )
}
