import React, { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { gsap } from 'gsap'

export default function ShutterTransition() {
  const { pathname } = useLocation()
  const topRef = useRef(null)
  const botRef = useRef(null)
  const scanRef = useRef(null)
  const isFirst = useRef(true)
  const tlRef = useRef(null)

  // Park panels off-screen once on mount — no inline CSS transforms
  useEffect(() => {
    gsap.set(topRef.current, { yPercent: -100 })
    gsap.set(botRef.current, { yPercent: 100 })
    gsap.set(scanRef.current, { opacity: 0 })
  }, [])

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }

    // Kill any running tween before starting a new one
    tlRef.current?.kill()

    const tl = gsap.timeline()
    tlRef.current = tl

    // Panels slam shut from top + bottom
    tl.to(topRef.current, { yPercent: 0, duration: 0.22, ease: 'power4.in' }, 0)
    tl.to(botRef.current, { yPercent: 0, duration: 0.22, ease: 'power4.in' }, 0)

    // Gold flash at the seam — camera exposure moment
    tl.to(scanRef.current, { opacity: 1, duration: 0.06 }, 0.2)
    tl.to(scanRef.current, { opacity: 0, duration: 0.14, ease: 'power2.in' }, 0.26)

    // Brief hold — new page renders underneath
    tl.to({}, { duration: 0.08 })

    // Panels spring open
    tl.to(topRef.current, { yPercent: -100, duration: 0.3, ease: 'power3.out' })
    tl.to(botRef.current, { yPercent: 100, duration: 0.3, ease: 'power3.out' }, '<')

  }, [pathname])

  return (
    <>
      {/* Top shutter blade */}
      <div ref={topRef} style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: '50%',
        zIndex: 99998,
        background: '#0c0c0c',
        willChange: 'transform',
        pointerEvents: 'none',
      }} />

      {/* Bottom shutter blade */}
      <div ref={botRef} style={{
        position: 'fixed',
        top: '50%', left: 0, right: 0, bottom: 0,
        zIndex: 99998,
        background: '#0c0c0c',
        willChange: 'transform',
        pointerEvents: 'none',
      }} />

      {/* Gold scan line at the center seam */}
      <div ref={scanRef} style={{
        position: 'fixed',
        top: 'calc(50% - 1px)',
        left: 0, right: 0,
        height: 2,
        zIndex: 99999,
        background: 'linear-gradient(90deg, transparent 0%, #F59E0B 25%, #FDE68A 50%, #F59E0B 75%, transparent 100%)',
        boxShadow: '0 0 18px #F59E0B, 0 0 48px rgba(245,158,11,0.35)',
        pointerEvents: 'none',
        willChange: 'opacity',
      }} />
    </>
  )
}
