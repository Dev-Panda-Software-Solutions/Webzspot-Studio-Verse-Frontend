import React from 'react'
import { Check, Dot } from 'lucide-react'

const rules = [
  { id: 'length', label: '8+ chars', test: value => value.length >= 8 },
  { id: 'upper', label: 'Uppercase', test: value => /[A-Z]/.test(value) },
  { id: 'lower', label: 'Lowercase', test: value => /[a-z]/.test(value) },
  { id: 'number', label: 'Number', test: value => /\d/.test(value) },
  { id: 'symbol', label: 'Symbol', test: value => /[^A-Za-z0-9]/.test(value) },
]

const levels = [
  { label: 'Too weak', color: '#F87171' },
  { label: 'Weak', color: '#FB923C' },
  { label: 'Fair', color: '#FBBF24' },
  { label: 'Strong', color: '#34D399' },
  { label: 'Excellent', color: '#22C55E' },
]

const getScore = (value) => {
  if (!value) return 0
  const passed = rules.filter(rule => rule.test(value)).length
  const lengthBonus = value.length >= 12 ? 1 : 0
  return Math.min(4, Math.max(1, passed - 1 + lengthBonus))
}

export default function PasswordStrength({ value = '', className = '' }) {
  if (!value) return null

  const score = getScore(value)
  const level = levels[score]

  return (
    <div className={`-mt-4 mb-5 ${className}`}>
      <div className="flex items-center gap-1.5 mb-2" aria-hidden="true">
        {[0, 1, 2, 3].map(index => (
          <div
            key={index}
            className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{
              background: index < score ? level.color : 'var(--border-subtle)',
              boxShadow: index < score ? `0 0 12px ${level.color}33` : 'none',
            }}
          />
        ))}
        <span className="ml-2 text-[11px] font-semibold whitespace-nowrap" style={{ color: level.color }}>
          {level.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {rules.map(rule => {
          const passed = rule.test(value)
          return (
            <span
              key={rule.id}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium"
              style={{
                color: passed ? '#34D399' : 'var(--text-tertiary)',
                background: passed ? 'rgba(52,211,153,0.1)' : 'var(--bg-elevated)',
                border: `1px solid ${passed ? 'rgba(52,211,153,0.22)' : 'var(--border-subtle)'}`,
              }}
            >
              {passed ? <Check size={10} /> : <Dot size={10} />}
              {rule.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
