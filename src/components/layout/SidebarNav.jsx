import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { gsap } from 'gsap'
import {
  LayoutDashboard, Building2, Users, Settings, LogOut,
  Camera, ChevronLeft, ChevronRight, Store
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Avatar from '../ui/Avatar'
import useAuthStore from '../../stores/authStore'
import { logout } from '../../api/auth'
import { useShutterNavigate } from '../../context/ShutterContext'
import toast from 'react-hot-toast'

const navItems = {
  SUPER_ADMIN: [
    { to: '/admin',         icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/studios', icon: Building2,       label: 'Studios'   },
    { to: '/admin/users',   icon: Users,           label: 'Users'     },
  ],
  ADMIN: [
    { to: '/studio',          icon: LayoutDashboard, label: 'Dashboard'     },
    { to: '/studio/settings', icon: Store,           label: 'Studio Profile' },
  ],
}

export default function SidebarNav({ onCollapse }) {
  const { user, role, logout: storeLogout } = useAuthStore()
  const navigate = useNavigate()
  const shutterNavigate = useShutterNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const sidebarRef = useRef(null)
  const items = navItems[role] || []

  // Active check — exact match for root paths, prefix match for nested
  const isActive = (to) => {
    if (to === '/studio' || to === '/admin') return location.pathname === to
    return location.pathname === to || location.pathname.startsWith(to + '/')
  }

  // Slide-in on mount — x only, opacity never touched
  useEffect(() => {
    gsap.fromTo(sidebarRef.current, { x: -16 }, { x: 0, duration: 0.45, ease: 'power3.out' })
  }, [])

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    onCollapse?.(next)
    gsap.to(sidebarRef.current, { width: next ? 64 : 240, duration: 0.3, ease: 'power3.inOut' })
  }

  const handleLogout = async () => {
    try { await logout() } catch {}
    storeLogout()
    navigate('/login')
    toast.success('Logged out')
  }

  // Sidebar is ALWAYS dark — like VS Code / Linear / Notion sidebars
  // This keeps it visible regardless of the page's light/dark mode
  const sb = {
    bg:          '#111113',
    border:      '#2A2A30',
    textPrimary: '#F5F5F7',
    textMuted:   '#A0A0AB',
    textTert:    '#6B6B76',
    activeBg:    'rgba(245,158,11,0.12)',
    hoverBg:     'rgba(255,255,255,0.05)',
    gold:        '#F59E0B',
  }

  return (
    <aside
      ref={sidebarRef}
      className="fixed left-0 top-0 h-screen flex flex-col z-40 select-none"
      style={{
        width: 240,
        background: sb.bg,
        borderRight: `1px solid ${sb.border}`,
        willChange: 'width',
      }}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 py-5 flex-shrink-0"
        style={{ borderBottom: `1px solid ${sb.border}` }}>
        <div className="w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center flex-shrink-0 shadow-gold">
          <Camera size={15} className="text-black" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}
              className="font-display font-semibold text-base truncate whitespace-nowrap"
              style={{ color: sb.gold }}
            >
              Studio-Verse
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── User chip ── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="px-4 py-3 flex-shrink-0"
            style={{ borderBottom: `1px solid ${sb.border}` }}
          >
            <div className="flex items-center gap-3">
              <Avatar name={user?.tenant_studio_name || user?.user_name || user?.super_admin_name || role || 'U'} size="sm" ring />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: sb.textPrimary }}>
                  {user?.tenant_studio_name || user?.user_name || user?.super_admin_name || 'User'}
                </p>
                <p className="text-xs truncate" style={{ color: sb.textTert }}>{role}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Nav items ── */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {items.map(({ to, icon: Icon, label }) => {
          const active = isActive(to)
          return (
            <div
              key={to}
              onClick={() => shutterNavigate(to)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150 group relative overflow-hidden cursor-pointer"
              style={{
                background: active ? sb.activeBg : 'transparent',
                color: active ? sb.gold : sb.textMuted,
                borderLeft: `3px solid ${active ? sb.gold : 'transparent'}`,
                paddingLeft: 9,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = sb.hoverBg }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={17} className="flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                    className="whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>

              {collapsed && (
                <div
                  className="absolute left-14 px-2 py-1 rounded text-xs whitespace-nowrap
                    opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
                  style={{
                    background: '#242428',
                    color: sb.textPrimary,
                    border: `1px solid ${sb.border}`,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  }}
                >
                  {label}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* ── Bottom ── */}
      <div className="p-3 flex-shrink-0 space-y-0.5" style={{ borderTop: `1px solid ${sb.border}` }}>
        {(() => {
          const active = isActive('/settings')
          return (
            <div
              onClick={() => shutterNavigate('/settings')}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                transition-colors duration-150 cursor-pointer"
              style={{
                color: active ? sb.gold : sb.textMuted,
                background: active ? sb.activeBg : 'transparent',
                borderLeft: `3px solid ${active ? sb.gold : 'transparent'}`,
                paddingLeft: 9,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = sb.hoverBg }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Settings size={17} className="flex-shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">Settings</span>}
            </div>
          )
        })()}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
            transition-colors duration-150 group"
          style={{ color: sb.textMuted, borderLeft: '3px solid transparent', paddingLeft: 9 }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#F87171'
            e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = sb.textMuted
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <LogOut size={17} className="flex-shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Logout</span>}
        </button>
      </div>

      {/* ── Collapse pill ── */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full
          flex items-center justify-center z-50 transition-colors duration-150"
        style={{
          background: sb.bg,
          border: `1px solid ${sb.border}`,
          color: sb.textTert,
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = sb.gold; e.currentTarget.style.color = sb.gold }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = sb.border; e.currentTarget.style.color = sb.textTert }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
