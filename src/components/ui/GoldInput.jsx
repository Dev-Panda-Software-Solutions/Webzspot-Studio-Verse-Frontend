import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function GoldInput({
  label, name, type = 'text', value, onChange,
  error, placeholder = ' ', className = '', ...rest
}) {
  const [showPass, setShowPass] = useState(false)
  const isPassword = type === 'password'
  const isDate = type === 'date'
  const inputType = isPassword ? (showPass ? 'text' : 'password') : type

  // Date inputs always show a value-like chrome UI, so always float the label
  const forceFloat = isDate || type === 'datetime-local' || type === 'time' || type === 'number'
  const shouldFloat = forceFloat || !!value

  return (
    <div className={`relative mb-6 ${className}`}>
      <input
        id={name}
        name={name}
        type={inputType}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...rest}
        className={`
          w-full bg-transparent border-b-2 pt-5 pb-2 pr-10 text-sm
          text-[var(--text-primary)] placeholder-transparent
          focus:outline-none transition-colors duration-200
          ${error
            ? 'border-red-500 focus:border-red-500'
            : 'border-[var(--border-default)] focus:border-[var(--accent-primary)]'
          }
        `}
      />
      <label
        htmlFor={name}
        className="absolute left-0 pointer-events-none transition-all duration-200 origin-left"
        style={{
          top: shouldFloat ? 0 : 18,
          fontSize: shouldFloat ? 11 : 14,
          transform: shouldFloat ? 'scale(1)' : 'scale(1)',
          color: shouldFloat ? 'var(--accent-primary)' : 'var(--text-tertiary)',
          fontWeight: shouldFloat ? 500 : 400,
        }}
      >
        {label}
      </label>

      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPass(v => !v)}
          className="absolute right-0 top-5 text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors"
        >
          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
