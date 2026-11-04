import React, { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import SidebarNav from './SidebarNav'
// import ThemeToggle from '../ui/ThemeToggle' // dark/light toggle disabled site-wide - see themeStore.js
import UploadStatusPanel from '../upload/UploadStatusPanel'

const getSavedCollapsed = () => localStorage.getItem('sv-sidebar-collapsed') === 'true'

export default function AppLayout({ children, title, subtitle, actions, fullBleed = false, mobileHeaderFlush = false, mobileHeaderInline = false }) {
  const [collapsed, setCollapsed] = useState(getSavedCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const touchStartX = useRef(null)

  // Keep the page fixed behind the drawer so the Clients list cannot scroll
  // underneath the mobile navigation.
  useEffect(() => {
    if (!mobileOpen || window.innerWidth >= 768) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [mobileOpen])

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  const openMobileNav = () => {
    if (window.innerWidth < 768) setCollapsed(false)
    setMobileOpen(true)
  }

  const handleTouchStart = (event) => {
    if (window.innerWidth >= 768 || mobileOpen) return
    const touch = event.touches[0]
    touchStartX.current = touch && touch.clientX <= 28 ? touch.clientX : null
  }

  const handleTouchEnd = (event) => {
    if (window.innerWidth >= 768 || mobileOpen || touchStartX.current === null) return
    const touch = event.changedTouches[0]
    const swipeDistance = touch ? touch.clientX - touchStartX.current : 0
    touchStartX.current = null
    if (swipeDistance >= 60) openMobileNav()
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ background: 'var(--bg-base)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <SidebarNav
        collapsed={collapsed}
        onCollapse={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
           className="fixed inset-0 z-30 bg-black/70 backdrop-blur-[2px] md:hidden"
        />
      )}
      {/* Spacer that matches sidebar width */}
      <div className="hidden md:block flex-shrink-0 transition-all duration-300" style={{ width: collapsed ? 64 : 240 }} />

      <div className="flex-1 min-w-0 max-w-full overflow-x-clip flex flex-col min-h-screen">
        {!title && (
          <button
            type="button"
            aria-label="Open navigation"
            onClick={openMobileNav}
            className="fixed left-3 top-3 z-50 md:hidden flex h-10 w-10 items-center justify-center rounded-xl shadow-lg"
            style={{
              color: 'var(--accent-primary)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.28)',
            }}
          >
            <Menu size={19} />
          </button>
        )}
        {/* Sticky page top bar */}
        {title && (
          <header
            className={`sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-8 flex-shrink-0 ${mobileHeaderFlush ? 'mobile-header-flush' : ''} ${mobileHeaderInline ? 'mobile-header-inline' : ''}`}
            style={{
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              boxShadow: '0 1px 0 rgba(0,0,0,0.1)',
              paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
                onClick={() => mobileOpen ? setMobileOpen(false) : openMobileNav()}
            className="md:hidden flex-shrink-0 -ml-2 flex h-10 w-10 items-center justify-center rounded-xl shadow-sm"
            style={{
              color: 'var(--accent-primary)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
            }}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="min-w-0">
                <h1 className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end min-w-0 max-w-full md:flex-shrink-0 ml-auto">
              {/* {!isTenantPortal && <ThemeToggle />} dark/light toggle disabled site-wide */}
              {actions}
            </div>
          </header>
        )}

        <main className={`flex-1 min-w-0 ${fullBleed ? 'p-0' : 'p-4 md:p-8'}`}>
          {children}
        </main>
      </div>
      <UploadStatusPanel />
    </div>
  )
}
