import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Users as UsersIcon, Trash2, UserX, RotateCcw } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import GlassCard from '../../components/ui/GlassCard'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import Badge from '../../components/ui/Badge'
import GoldButton from '../../components/ui/GoldButton'
import Avatar from '../../components/ui/Avatar'
import { getUsers, deleteUser, hardDeleteUser, restoreUser } from '../../api/users'
import { formatDate, isExpired, clientDisplayName } from '../../utils/formatters'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('active')
  const { data, isLoading } = useQuery({
    queryKey: ['users', page, status],
    queryFn: () => getUsers({ page, limit: 15, status })
  })
  const items = data?.data?.items || []
  const total = data?.data?.total || 0
  const pages = data?.data?.pages || 1

  const handleSoftDelete = async (userId, userName) => {
    if (!window.confirm(`Archive "${userName}"? They will immediately lose access, but nothing is deleted.`)) return
    try {
      await deleteUser(userId)
      toast.success('User archived')
      qc.invalidateQueries(['users'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed') }
  }

  const handleRestore = async (userId, userName) => {
    if (!window.confirm(`Restore "${userName}"? They will regain access immediately.`)) return
    try {
      await restoreUser(userId)
      toast.success('User restored')
      qc.invalidateQueries(['users'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed') }
  }

  const handleHardDelete = async (userId, userName) => {
    if (!window.confirm(`Permanently delete "${userName}"? This cannot be undone.`)) return
    try {
      await hardDeleteUser(userId)
      toast.success('User permanently deleted')
      qc.invalidateQueries(['users'])
    } catch (err) { toast.error(typeof err === 'string' ? err : 'Failed') }
  }

  return (
    <AppLayout title="All Clients" subtitle={`${total} clients across all studios`}>

      <div className="flex gap-1 p-1 rounded-xl mb-4 w-fit" style={{ background: 'var(--bg-elevated)' }}>
        {[
          { key: 'active', label: 'Active' },
          { key: 'archived', label: 'Archived' },
          { key: 'all', label: 'All' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setStatus(key); setPage(1) }}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: status === key ? 'var(--bg-surface)' : 'transparent',
              color: status === key ? '#F59E0B' : 'var(--text-secondary)',
              boxShadow: status === key ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <GlassCard hover={false} className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['Client', 'Email', 'Studio', 'Expires', 'Status', ''].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-4">
                  {[...Array(6)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}
                </td></tr>
              ) : items.map(u => (
                <tr key={u.user_id} className="border-b hover:bg-[var(--bg-elevated)] transition-colors group"
                  style={{ borderColor: 'var(--border-subtle)' }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.user_name} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{clientDisplayName(u)}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{u.user_phone_number || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{u.user_email_id || '—'}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{u.created_by?.tenant_studio_name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-tertiary)]">
                    {u.expiry_date ? formatDate(u.expiry_date) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {!u.isactive
                      ? <Badge variant="error">Archived</Badge>
                      : u.expiry_date
                        ? <Badge variant={isExpired(u.expiry_date) ? 'error' : 'success'}>
                            {isExpired(u.expiry_date) ? 'Expired' : 'Active'}
                          </Badge>
                        : <Badge variant="success">Active</Badge>
                    }
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {u.isactive ? (
                        <button
                          onClick={() => handleSoftDelete(u.user_id, u.user_name)}
                          title="Archive user"
                          className="p-1.5 rounded transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#FBBF24'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                        >
                          <UserX size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(u.user_id, u.user_name)}
                          title="Restore user"
                          className="p-1.5 rounded transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#34D399'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleHardDelete(u.user_id, u.user_name)}
                        title="Permanently delete"
                        className="p-1.5 rounded transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#F87171'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <p className="text-xs text-[var(--text-tertiary)]">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <GoldButton size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>←</GoldButton>
              <GoldButton size="sm" variant="outline" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}>→</GoldButton>
            </div>
          </div>
        )}
      </GlassCard>
    </AppLayout>
  )
}
