import React, { useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import GoldButton from '../../components/ui/GoldButton'

export default function NotFound() {
  const navigate = useNavigate()
  const ref = useRef(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(ref.current, { opacity: 0, y: 30, duration: 0.6, ease: 'power3.out' })
    })
    return () => ctx.revert()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center text-center px-6"
      style={{ background: 'var(--bg-base)' }}>
      <div ref={ref}>
        <p className="font-display text-9xl font-bold text-gold-shimmer mb-4">404</p>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Page not found</h1>
        <p className="text-[var(--text-secondary)] mb-8">The page you're looking for doesn't exist.</p>
        <GoldButton onClick={() => navigate(-1)} variant="outline">Go Back</GoldButton>
      </div>
    </div>
  )
}
