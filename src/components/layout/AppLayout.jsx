import React, { useState } from 'react'
import { Menu, X } from 'lucide-react'
import SidebarNav from './SidebarNav'
// import ThemeToggle from '../ui/ThemeToggle' // dark/light toggle disabled site-wide — see themeStore.js
import UploadStatusPanel from '../upload/UploadStatusPanel'

const getSavedCollapsed = () => localStorage.getItem('sv-sidebar-collapsed') === 'true'

export default function AppLayout({ children, title, subtitle, actions }) {
  const [collapsed, setCollapsed] = useState(getSavedCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
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
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
        />
      )}
      {/* Spacer that matches sidebar width */}
      <div className="hidden md:block flex-shrink-0 transition-all duration-300" style={{ width: collapsed ? 64 : 240 }} />

      <div className="flex-1 min-w-0 max-w-full overflow-x-clip flex flex-col min-h-screen">
        {!title && (
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="fixed left-3 top-3 z-40 md:hidden p-2 rounded-lg bg-black/50"
            style={{ color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
          >
            <Menu size={19} />
          </button>
        )}
        {/* Sticky page top bar */}
        {title && (
          <header
            className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-8 flex-shrink-0"
            style={{
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              boxShadow: '0 1px 0 rgba(0,0,0,0.1)',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
                className="md:hidden flex-shrink-0 p-2 -ml-2 rounded-lg"
                style={{ color: 'var(--text-secondary)' }}
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

        <main className="flex-1 min-w-0 p-4 md:p-8">
          {children}
        </main>
      </div>
      <UploadStatusPanel />
    </div>
  )
}
