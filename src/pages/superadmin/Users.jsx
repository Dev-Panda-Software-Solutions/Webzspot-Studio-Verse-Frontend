import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users as UsersIcon } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import PageHeader from '../../components/layout/PageHeader'
import GlassCard from '../../components/ui/GlassCard'
import SkeletonLoader from '../../components/ui/SkeletonLoader'
import Badge from '../../components/ui/Badge'
import GoldButton from '../../components/ui/GoldButton'
import Avatar from '../../components/ui/Avatar'
import { getUsers } from '../../api/users'
import { formatDate, isExpired } from '../../utils/formatters'

export default function AdminUsers() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => getUsers({ page, limit: 15 })
  })
  const items = data?.data?.items || []
  const total = data?.data?.total || 0
  const pages = data?.data?.pages || 1

  return (
    <AppLayout title="All Clients" subtitle={`${total} clients across all studios`}>

      <GlassCard hover={false} className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['Client', 'Email', 'Studio', 'Expires', 'Status'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-4">
                  {[...Array(6)].map((_, i) => <SkeletonLoader key={i} type="table-row" />)}
                </td></tr>
              ) : items.map(u => (
                <tr key={u.id} className="border-b hover:bg-[var(--bg-elevated)] transition-colors"
                  style={{ borderColor: 'var(--border-subtle)' }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{u.name}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{u.phone || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{u.email || '—'}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{u.tenant?.studio_name || '—'}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-tertiary)]">
                    {u.expiry_date ? formatDate(u.expiry_date) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {u.expiry_date
                      ? <Badge variant={isExpired(u.expiry_date) ? 'error' : 'success'}>
                          {isExpired(u.expiry_date) ? 'Expired' : 'Active'}
                        </Badge>
                      : <Badge>No expiry</Badge>
                    }
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
