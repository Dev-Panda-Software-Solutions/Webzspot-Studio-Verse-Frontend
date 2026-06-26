import React, { useRef, useCallback } from 'react'

export default function GoldButton({
  children, onClick, type = 'button', variant = 'solid',
  size = 'md', loading = false, disabled = false, className = '', icon
}) {
  const btnRef = useRef(null)

  // Ripple effect on click
  const handleClick = useCallback((e) => {
    const btn = btnRef.current
    if (!btn) { onClick?.(e); return }

    const rect = btn.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ripple = document.createElement('span')
    const size = Math.max(rect.width, rect.height) * 2
    ripple.style.cssText = `
      position:absolute;
      width:${size}px;height:${size}px;
      left:${x - size / 2}px;top:${y - size / 2}px;
      border-radius:50%;
      background:rgba(255,255,255,0.25);
      transform:scale(0);
      animation:goldRipple 0.55s ease-out forwards;
      pointer-events:none;
    `
    btn.appendChild(ripple)
    ripple.addEventListener('animationend', () => ripple.remove())
    onClick?.(e)
  }, [onClick])

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3 text-base',
    xl: 'px-9 py-4 text-lg',
  }

  const variants = {
    solid: 'gold-btn-solid text-obsidian-base font-semibold',
    outline: 'gold-btn-outline text-gold-500',
    ghost: 'gold-btn-ghost text-gold-500',
    danger: 'gold-btn-danger text-white font-semibold',
  }

  return (
    <>
      <style>{`
        @keyframes goldRipple {
          to { transform: scale(1); opacity: 0; }
        }

        .gold-btn-solid {
          background: linear-gradient(135deg, #B8860B 0%, #D4AF37 50%, #FFD700 100%);
          background-size: 200% 200%;
          background-position: 100% 0;
          box-shadow: 0 2px 12px rgba(212,175,55,0.3);
          transition: background-position 0.4s ease, box-shadow 0.3s ease, transform 0.15s ease;
        }
        .gold-btn-solid:hover:not(:disabled) {
          background-position: 0% 100%;
          box-shadow: 0 4px 20px rgba(212,175,55,0.5), 0 0 0 1px rgba(212,175,55,0.3);
          transform: translateY(-1px);
        }
        .gold-btn-solid:active:not(:disabled) {
          transform: translateY(0) scale(0.97);
          box-shadow: 0 2px 8px rgba(212,175,55,0.3);
        }

        .gold-btn-outline {
          border: 1px solid #D4AF37;
          background: transparent;
          transition: background 0.25s ease, color 0.25s ease, box-shadow 0.25s ease, transform 0.15s ease;
        }
        .gold-btn-outline:hover:not(:disabled) {
          background: rgba(212,175,55,0.12);
          box-shadow: 0 0 0 1px rgba(212,175,55,0.4), inset 0 0 12px rgba(212,175,55,0.08);
          transform: translateY(-1px);
        }
        .gold-btn-outline:active:not(:disabled) {
          transform: scale(0.97);
        }

        .gold-btn-ghost {
          background: transparent;
          transition: background 0.2s ease, transform 0.15s ease;
        }
        .gold-btn-ghost:hover:not(:disabled) {
          background: rgba(212,175,55,0.1);
          transform: translateY(-1px);
        }
        .gold-btn-ghost:active:not(:disabled) {
          transform: scale(0.96);
        }

        .gold-btn-danger {
          background: linear-gradient(135deg, #b91c1c, #ef4444);
          background-size: 200% 200%;
          background-position: 100% 0;
          box-shadow: 0 2px 10px rgba(239,68,68,0.25);
          transition: background-position 0.4s ease, box-shadow 0.3s ease, transform 0.15s ease;
        }
        .gold-btn-danger:hover:not(:disabled) {
          background-position: 0% 100%;
          box-shadow: 0 4px 16px rgba(239,68,68,0.45);
          transform: translateY(-1px);
        }
        .gold-btn-danger:active:not(:disabled) {
          transform: scale(0.97);
        }
      `}</style>

      <button
        ref={btnRef}
        type={type}
        onClick={handleClick}
        disabled={disabled || loading}
        className={`
          relative inline-flex items-center gap-2 rounded-lg font-medium
          overflow-hidden select-none
          disabled:opacity-40 disabled:cursor-not-allowed
          ${sizes[size]} ${variants[variant]} ${className}
        `}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : icon}
        <span>{loading ? 'Loading...' : children}</span>
      </button>
    </>
  )
}
