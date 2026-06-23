import React, { useRef } from 'react'
import { Sun, Moon } from 'lucide-react'
import { gsap } from 'gsap'
import useThemeStore from '../../stores/themeStore'

export default function ThemeToggle({ size = 'md' }) {
  const { theme, toggleTheme } = useThemeStore()
  const iconRef = useRef(null)
  const isDark = theme === 'dark'

  const handleToggle = () => {
    gsap.to(iconRef.current, {
      rotation: 360, scale: 0, duration: 0.25, ease: 'power2.in',
      onComplete: () => {
        toggleTheme()
        gsap.fromTo(iconRef.current,
          { rotation: 0, scale: 0 },
          { rotation: 0, scale: 1, duration: 0.35, ease: 'back.out(2)' }
        )
      }
    })
  }

  const s = size === 'lg' ? 'p-3' : 'p-2'

  return (
    <button
      onClick={handleToggle}
      className={`${s} rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-primary)]
        hover:bg-[var(--accent-muted)] transition-colors duration-200`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span ref={iconRef} className="block">
        {isDark ? <Sun size={size === 'lg' ? 20 : 16} /> : <Moon size={size === 'lg' ? 20 : 16} />}
      </span>
    </button>
  )
}
