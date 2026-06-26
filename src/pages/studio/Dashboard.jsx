import React, { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ImageIcon, Users, Heart, TrendingUp, Camera, Star, Layers } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import AppLayout from '../../components/layout/AppLayout'
import StatCard from '../../components/ui/StatCard'
import EventCard from '../../components/events/EventCard'
import CreateEventModal from '../../components/events/CreateEventModal'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import GlassCard from '../../components/ui/GlassCard'
import GoldButton from '../../components/ui/GoldButton'
import { getEvents, getDashboardAnalytics, deleteEvent } from '../../api/events'
import useAuthStore from '../../stores/authStore'
import { greetingTime } from '../../utils/formatters'
import toast from 'react-hot-toast'

/* ── Shared chart theme ─────────────────────────────────────── */
const GOLD = '#F59E0B'
const GOLD2 = '#FDE68A'
const MUTED = '#6B6B76'
const BG = 'rgba(0,0,0,0)'

const tooltipStyle = {
  contentStyle: {
    background: '#18181B',
    border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: 10,
    color: '#F5F5F7',
    fontSize: 12,
    padding: '8px 12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  itemStyle: { color: GOLD },
  labelStyle: { color: '#A0A0AB', marginBottom: 4 },
}

const axisProps = {
  tick: { fill: '#6B6B76', fontSize: 11 },
  axisLine: false,
  tickLine: false,
}

// Format "2026-01" → "Jan"
const shortMonth = (key) => {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short' })
}

/* ── Mini sparkline inside stat cards ───────────────────────── */
function Sparkline({ data, color = GOLD }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data.map(d => d.count), 1)
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 60,
    y: 18 - (d.count / max) * 16,
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  return (
    <svg width={64} height={22} className="opacity-70">
      <polyline points={pts.map(p => `${p.x},${p.y}`).join(' ')}
        fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Custom tooltip for area/bar charts ─────────────────────── */
function ChartTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle.contentStyle}>
      <p style={tooltipStyle.labelStyle}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || GOLD, fontWeight: 600 }}>
          {p.value}{suffix} <span style={{ color: '#A0A0AB', fontWeight: 400 }}>{p.name}</span>
        </p>
      ))}
    </div>
  )
}

/* ── Donut cell labels ──────────────────────────────────────── */
const DONUT_COLORS = [GOLD, '#3F3F46']
function DonutLabel({ cx, cy, active, archived }) {
  const total = active + archived
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.4em" fill="#F5F5F7" fontSize={22} fontWeight={700}>{total}</tspan>
      <tspan x={cx} dy="1.5em" fill="#6B6B76" fontSize={11}>events</tspan>
    </text>
  )
}

/* ── Horizontal bar for top events ─────────────────────────── */
function TopEventsBar({ data }) {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-24">
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>No media uploaded yet</p>
    </div>
  )
  const max = Math.max(...data.map(d => d.media_count), 1)
  return (
    <div className="space-y-3 mt-2">
      {data.map((ev, i) => (
        <div key={ev.event_id}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs truncate max-w-[60%]" style={{ color: 'var(--text-primary)' }}>
              {ev.event_name}
            </span>
            <span className="text-xs font-mono" style={{ color: GOLD }}>{ev.media_count}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(ev.media_count / max) * 100}%`,
                background: i === 0
                  ? `linear-gradient(90deg, ${GOLD}, ${GOLD2})`
                  : `linear-gradient(90deg, ${GOLD}88, ${GOLD}44)`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Section header ─────────────────────────────────────────── */
function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>}
    </div>
  )
}

/* ── Main dashboard ─────────────────────────────────────────── */
export default function StudioDashboard() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const containerRef = useRef(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [page, setPage] = useState(1)

  const handleArchiveEvent = async (eventId, eventName) => {
    if (!window.confirm(`Archive "${eventName}"? Clients will lose access.`)) return
    try {
      await deleteEvent(eventId)
      toast.success('Event archived')
      qc.invalidateQueries(['events'])
      qc.invalidateQueries(['dashboard-analytics'])
    } catch { toast.error('Failed to archive event') }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['events', page],
    queryFn: () => getEvents({ page, limit: 8 })
  })

  const { data: analyticsData, isLoading: aLoading } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: getDashboardAnalytics,
    staleTime: 60_000,
  })

  const events = data?.data?.items || []
  const total = data?.data?.total || 0
  const pages = data?.data?.pages || 1
  const analytics = analyticsData?.data || {}
  const totals = analytics.totals || {}
  const eventsByMonth = (analytics.events_by_month || []).map(d => ({ ...d, label: shortMonth(d.month) }))
  const mediaByMonth = (analytics.media_by_month || []).map(d => ({ ...d, label: shortMonth(d.month) }))
  const topEvents = analytics.top_events || []
  const eventStatus = analytics.event_status || { active: 0, archived: 0 }
  const donutData = [
    { name: 'Active', value: eventStatus.active },
    { name: 'Archived', value: eventStatus.archived },
  ]

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.stat-row > *', { y: 22, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.09, duration: 0.5, delay: 0.1, ease: 'power3.out' })
      gsap.fromTo('.chart-section', { y: 28, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.55, delay: 0.55, ease: 'power3.out' })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  useLayoutEffect(() => {
    if (!events.length) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.event-card', { y: 24, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, stagger: 0.07, duration: 0.45, ease: 'power3.out' })
    }, containerRef)
    return () => ctx.revert()
  }, [events.length])

  return (
    <AppLayout
      title={`${greetingTime()}, ${user?.tenant_studio_name || user?.user_name || 'Studio'}`}
      subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      actions={<GoldButton onClick={() => setCreateOpen(true)} icon={<Camera size={14} />}>New Event</GoldButton>}
    >
      <div ref={containerRef}>
        {/* ── Stat Cards ─── */}
        <div className="stat-row grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Events" value={totals.events ?? total} icon={CalendarDays}
            sub={<Sparkline data={eventsByMonth} />} />
          <StatCard label="Media Files" value={totals.media ?? 0} icon={ImageIcon}
            sub={<Sparkline data={mediaByMonth} />} />
          <StatCard label="Clients" value={totals.clients ?? 0} icon={Users} />
          <StatCard label="Favourites" value={totals.favourites ?? 0} icon={Heart} />
        </div>

        {/* ── Charts row ─── */}
        <div className="chart-section grid xl:grid-cols-3 gap-5 mb-8">

          {/* Media uploads area chart */}
          <GlassCard hover={false} className="xl:col-span-2">
            <SectionHeader
              title="Media Uploads"
              subtitle="Files uploaded over the last 6 months"
            />
            {aLoading ? (
              <div className="h-52 skeleton rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={mediaByMonth} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mediaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GOLD} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip suffix=" files" />} />
                  <Area
                    type="monotone" dataKey="count" name="uploads"
                    stroke={GOLD} strokeWidth={2}
                    fill="url(#mediaGrad)"
                    dot={{ fill: GOLD, strokeWidth: 0, r: 3 }}
                    activeDot={{ fill: '#FDE68A', r: 5, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          {/* Event status donut */}
          <GlassCard hover={false}>
            <SectionHeader title="Event Status" subtitle="Active vs archived" />
            {aLoading ? (
              <div className="h-52 skeleton rounded-lg" />
            ) : (
              <div className="flex flex-col items-center">
                <div className="relative w-full h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData.filter(d => d.value > 0)}
                        cx="50%" cy="50%"
                        innerRadius={48} outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        startAngle={90} endAngle={-270}
                      >
                        {donutData.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle.contentStyle}
                        itemStyle={tooltipStyle.itemStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center">
                    <p className="text-2xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                      {eventStatus.active + eventStatus.archived}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>events</p>
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                  {donutData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: DONUT_COLORS[i] }} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* ── Bottom row ─── */}
        <div className="chart-section grid xl:grid-cols-3 gap-5 mb-8">

          {/* Events per month bar chart */}
          <GlassCard hover={false}>
            <SectionHeader title="Events Created" subtitle="Last 6 months" />
            {aLoading ? (
              <div className="h-44 skeleton rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={eventsByMonth} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip suffix=" events" />} />
                  <Bar dataKey="count" name="events" radius={[4, 4, 0, 0]}>
                    {eventsByMonth.map((_, i) => (
                      <Cell key={i}
                        fill={i === eventsByMonth.length - 1
                          ? GOLD
                          : `rgba(245,158,11,${0.28 + (i / (eventsByMonth.length - 1)) * 0.4})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          {/* Top events by media */}
          <GlassCard hover={false} className="xl:col-span-2">
            <SectionHeader title="Top Events by Media" subtitle="Events with the most uploaded files" />
            {aLoading ? (
              <div className="h-44 skeleton rounded-lg" />
            ) : (
              <TopEventsBar data={topEvents} />
            )}
          </GlassCard>
        </div>

        {/* ── Events Grid ─── */}
        <div className="chart-section">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Your Events</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{total} total</p>
            </div>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                <GoldButton size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</GoldButton>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{page} / {pages}</span>
                <GoldButton size="sm" variant="outline" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>→</GoldButton>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <SkeletonLoader key={i} type="event-card" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {events.map(item => (
                <EventCard key={item.event_id} event={item} eventId={item.event_id} onDelete={handleArchiveEvent} />
              ))}
              <EventCard isNew onCreate={() => setCreateOpen(true)} />
            </div>
          )}
        </div>

        <CreateEventModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => { qc.invalidateQueries(['events']); qc.invalidateQueries(['dashboard-analytics']) }}
        />
      </div>
    </AppLayout>
  )
}
