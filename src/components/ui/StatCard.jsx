import React, { useRef, useEffect } from 'react'
import { gsap } from 'gsap'

export default function StatCard({ label, value = 0, icon: Icon, sub }) {
  const numRef = useRef(null)
  const iconWrapRef = useRef(null)
  const lineRef = useRef(null)
  const cardRef = useRef(null)

  useEffect(() => {
    // Number count-up
    const obj = { val: 0 }
    gsap.to(obj, {
      val: value,
      duration: 1.8,
      ease: 'power2.out',
      onUpdate: () => {
        if (numRef.current) numRef.current.textContent = Math.ceil(obj.val).toLocaleString()
      }
    })
    // Icon drops in
    gsap.fromTo(iconWrapRef.current,
      { y: 10, opacity: 0, scale: 0.8 },
      { y: 0, opacity: 1, scale: 1, duration: 0.55, delay: 0.15, ease: 'back.out(2)' }
    )
    // Bottom line starts at 0
    gsap.set(lineRef.current, { scaleX: 0 })
  }, [value])

  const handleEnter = () => {
    gsap.to(cardRef.current, { y: -3, duration: 0.25, ease: 'power2.out' })
    gsap.to(iconWrapRef.current, { y: -4, scale: 1.12, rotate: 8, duration: 0.28, ease: 'back.out(2)' })
    gsap.to(lineRef.current, { scaleX: 1, duration: 0.4, ease: 'power2.out' })
  }
  const handleLeave = () => {
    gsap.to(cardRef.current, { y: 0, duration: 0.3, ease: 'power2.out' })
    gsap.to(iconWrapRef.current, { y: 0, scale: 1, rotate: 0, duration: 0.3, ease: 'power2.out' })
    gsap.to(lineRef.current, { scaleX: 0, duration: 0.3, ease: 'power2.in' })
  }

  return (
    <div
      ref={cardRef}
      className="glass rounded-xl p-6 relative overflow-hidden cursor-default"
      style={{ willChange: 'transform' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Shimmer on hover */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.025) 0%, transparent 60%)' }} />

      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-medium uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}>
          {label}
        </p>
        {Icon && (
          <div ref={iconWrapRef} className="p-2 rounded-lg" style={{ background: 'var(--accent-muted)' }}>
            <Icon size={16} className="text-gold-500" />
          </div>
        )}
      </div>

      <div className="flex items-end justify-between">
        <p ref={numRef} className="font-display text-4xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          0
        </p>
        {sub && <div className="mb-1">{sub}</div>}
      </div>

      {/* Gold sweep line — grows from center on hover */}
      <div ref={lineRef} className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, transparent, #F59E0B 30%, #FDE68A 50%, #F59E0B 70%, transparent)',
          transformOrigin: 'center',
          willChange: 'transform',
        }}
      />
    </div>
  )
}
