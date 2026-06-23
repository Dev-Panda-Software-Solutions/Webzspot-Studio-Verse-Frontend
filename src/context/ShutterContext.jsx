import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'

const Ctx = createContext(null)

export function ShutterProvider({ children }) {
  const navigate = useNavigate()
  const topRef = useRef(null)
  const botRef = useRef(null)
  const scanRef = useRef(null)
  const tlRef = useRef(null)

  useEffect(() => {
    gsap.set(topRef.current, { yPercent: -100 })
    gsap.set(botRef.current, { yPercent: 100 })
    gsap.set(scanRef.current, { opacity: 0 })
  }, [])

  const shutterNavigate = useCallback((to, options) => {
    if (window.location.pathname === to) return

    tlRef.current?.kill()
    const tl = gsap.timeline()
    tlRef.current = tl

    // ① Panels slam shut from top + bottom
    tl.to(topRef.current, { yPercent: 0, duration: 0.22, ease: 'power4.in' }, 0)
    tl.to(botRef.current, { yPercent: 0, duration: 0.22, ease: 'power4.in' }, 0)

    // ② Gold scan-line flash at the seam
    tl.to(scanRef.current, { opacity: 1, duration: 0.06 }, 0.19)
    tl.to(scanRef.current, { opacity: 0, duration: 0.12 }, 0.25)

    // ③ Navigate AFTER panels are fully closed — new page renders under them
    tl.call(() => navigate(to, options), null, 0.23)

    // ④ Brief hold so page can mount
    // ⑤ Panels spring open to reveal new page
    tl.to(topRef.current, { yPercent: -100, duration: 0.3, ease: 'power3.out' }, 0.33)
    tl.to(botRef.current, { yPercent: 100, duration: 0.3, ease: 'power3.out' }, 0.33)
  }, [navigate])

  return (
    <Ctx.Provider value={{ shutterNavigate }}>
      {/* Top shutter blade */}
      <div ref={topRef} style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: '50%',
        zIndex: 99998, background: '#0c0c0c',
        willChange: 'transform', pointerEvents: 'none',
      }} />
      {/* Bottom shutter blade */}
      <div ref={botRef} style={{
        position: 'fixed', top: '50%', left: 0, right: 0, bottom: 0,
        zIndex: 99998, background: '#0c0c0c',
        willChange: 'transform', pointerEvents: 'none',
      }} />
      {/* Gold scan line */}
      <div ref={scanRef} style={{
        position: 'fixed', top: 'calc(50% - 1px)', left: 0, right: 0, height: 2,
        zIndex: 99999, pointerEvents: 'none', willChange: 'opacity',
        background: 'linear-gradient(90deg, transparent 0%, #F59E0B 25%, #FDE68A 50%, #F59E0B 75%, transparent 100%)',
        boxShadow: '0 0 18px #F59E0B, 0 0 48px rgba(245,158,11,0.35)',
      }} />

      {children}
    </Ctx.Provider>
  )
}

export function useShutterNavigate() {
  const ctx = useContext(Ctx)
  const fallback = useNavigate()
  return ctx?.shutterNavigate ?? fallback
}
