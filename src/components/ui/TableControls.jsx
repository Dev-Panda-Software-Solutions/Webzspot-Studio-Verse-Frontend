import React from 'react'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'

export function TableToolbar({ value, onChange, placeholder = 'Search…', filters = [], sortOptions = [], sortValue, onSortChange, resultCount }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-0">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl outline-none"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }} />
      </div>
      {filters.map(filter => (
        <label key={filter.label || filter.name} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
          <SlidersHorizontal size={13} />
          <span className="sr-only">{filter.label}</span>
          <select value={filter.value} onChange={e => filter.onChange(e.target.value)} className="bg-transparent outline-none text-sm" style={{ color: 'inherit' }}>
            {filter.options.map(option => <option key={option.value} value={option.value} style={{ background: '#18181b' }}>{option.label}</option>)}
          </select>
        </label>
      ))}
      {sortOptions.length > 0 && (
        <select value={sortValue} onChange={e => onSortChange(e.target.value)} aria-label="Sort results"
          className="rounded-xl px-3 py-2 text-sm outline-none" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
          {sortOptions.map(option => <option key={option.value} value={option.value} style={{ background: '#18181b' }}>{option.label}</option>)}
        </select>
      )}
      {resultCount != null && <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>{resultCount} results</span>}
    </div>
  )
}

export function TablePagination({ page, pages, total, onPageChange, pageSize, onPageSizeChange }) {
  if (!pages || pages <= 1) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <span>Page {page} of {pages} · {total} total</span>
        {onPageSizeChange && <select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))} className="rounded-lg px-2 py-1 outline-none" style={{ background: 'var(--bg-elevated)', color: 'inherit', border: '1px solid var(--border-default)' }} aria-label="Rows per page">
          {[10, 15, 25, 50].map(size => <option key={size} value={size}>{size} / page</option>)}
        </select>}
      </div>
      <div className="flex gap-2">
        <button type="button" aria-label="Previous page" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}><ChevronLeft size={15} /></button>
        <button type="button" aria-label="Next page" onClick={() => onPageChange(Math.min(pages, page + 1))} disabled={page >= pages} className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-40" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}><ChevronRight size={15} /></button>
      </div>
    </div>
  )
}
