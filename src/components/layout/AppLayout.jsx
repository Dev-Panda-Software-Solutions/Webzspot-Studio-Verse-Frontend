import React, { useState } from 'react'
import SidebarNav from './SidebarNav'

export default function AppLayout({ children, title, subtitle, actions }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <SidebarNav onCollapse={setCollapsed} />
      {/* Spacer that matches sidebar width */}
      <div className="flex-shrink-0 transition-all duration-300" style={{ width: collapsed ? 64 : 240 }} />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Sticky page top bar */}
        {title && (
          <header
            className="sticky top-0 z-30 flex items-center justify-between px-8 py-3 flex-shrink-0"
            style={{
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              boxShadow: '0 1px 0 rgba(0,0,0,0.1)',
            }}
          >
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
            {actions && (
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                {actions}
              </div>
            )}
          </header>
        )}

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
