import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPlans } from '../../api/plans'
import GoldInput from '../ui/GoldInput'
import toast from 'react-hot-toast'

// Shared "Free Access grant" picker used in both the Create Studio form and
// the Studio detail popup: super admin picks one of the existing plans and an
// expiry (preset months or a custom date). A plan and an expiry always travel
// together — a studio can never get an expiry alone.
const PRESETS = [
  { key: '1m', label: '1 month' },
  { key: '3m', label: '3 months' },
  { key: '6m', label: '6 months' },
  { key: '12m', label: '12 months' },
]

const addMonths = (months) => {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d
}

export default function FreeAccessGrantFields({ value, onChange }) {
  const [mode, setMode] = useState(value?.expires_at ? 'custom' : '6m')
  const [customDate, setCustomDate] = useState(
    value?.expires_at ? new Date(value.expires_at).toISOString().slice(0, 10) : ''
  )

  const { data } = useQuery({
    queryKey: ['plans', 'free-access'],
    queryFn: () => getPlans({ page: 1, limit: 50 }),
    staleTime: 60_000,
  })
  const plans = (data?.data?.items || []).filter(p => p.plan_type === 'SUBSCRIPTION')

  const expireISO = () => {
    if (mode === 'custom') {
      if (!customDate) return null
      return new Date(`${customDate}T23:59:59`).toISOString()
    }
    const months = Number(mode.replace('m', ''))
    return addMonths(months).toISOString()
  }

  const commit = (nextPlanId, nextMode, nextCustomDate) => {
    const m = nextMode ?? mode
    const cd = nextCustomDate ?? customDate
    setMode(m)
    setCustomDate(cd)
    const expires_at = (() => {
      if (m === 'custom') {
        return cd ? new Date(`${cd}T23:59:59`).toISOString() : null
      }
      return addMonths(Number(m.replace('m', ''))).toISOString()
    })()
    if (expires_at && new Date(expires_at) <= new Date()) {
      toast.error('Free access must end in the future')
      return
    }
    onChange({ subscription_plan_id: nextPlanId ?? value?.subscription_plan_id ?? '', expires_at })
  }

  return (
    <div className="mb-4 space-y-3">
      <div>
        <label className="block text-[11px] mb-1.5 font-medium" style={{ color: 'var(--accent-primary)' }}>
          Free access plan
        </label>
        <select
          value={value?.subscription_plan_id || ''}
          onChange={e => commit(e.target.value)}
          className="w-full bg-transparent border-b-2 py-2 text-sm focus:outline-none transition-colors"
          style={{
            color: 'var(--text-primary)',
            borderColor: 'var(--border-default)',
          }}
        >
          <option value="" disabled>Select a plan…</option>
          {plans.map(p => (
            <option key={p.subscription_plan_id} value={p.subscription_plan_id}>
              {p.plan_name} — ₹{Number(p.price).toLocaleString('en-IN')} ({p.duration_value} {p.duration_unit === 'MONTHS' ? 'mo' : p.duration_unit === 'YEARS' ? 'yr' : 'days'}, {p.photo_quota} photos)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] mb-1.5 font-medium" style={{ color: 'var(--accent-primary)' }}>
          Free until
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => commit(undefined, p.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
              style={{
                borderColor: mode === p.key ? 'rgba(245,158,11,0.5)' : 'var(--border-default)',
                background: mode === p.key ? 'rgba(245,158,11,0.12)' : 'transparent',
                color: mode === p.key ? '#F59E0B' : 'var(--text-secondary)',
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => commit(undefined, 'custom')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
            style={{
              borderColor: mode === 'custom' ? 'rgba(245,158,11,0.5)' : 'var(--border-default)',
              background: mode === 'custom' ? 'rgba(245,158,11,0.12)' : 'transparent',
              color: mode === 'custom' ? '#F59E0B' : 'var(--text-secondary)',
            }}
          >
            Custom date
          </button>
        </div>
        {mode === 'custom' && (
          <div className="mt-2 w-56">
            <GoldInput
              label="Expiry date"
              name="free-access-custom-date"
              type="date"
              value={customDate}
              onChange={e => commit(undefined, 'custom', e.target.value)}
            />
          </div>
        )}
      </div>
      <p className="text-xs -mt-1" style={{ color: 'var(--text-tertiary)' }}>
        The studio gets the chosen plan for free until the expiry — revocable anytime.
      </p>
    </div>
  )
}
